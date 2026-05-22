.PHONY: help dev seed test lint clean docker-up docker-down

# ── Default ───────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  DeFi Sustainability Dashboard — Developer Commands"
	@echo ""
	@echo "  make dev          Start backend + frontend in watch mode"
	@echo "  make backend      Start FastAPI backend only"
	@echo "  make frontend     Start Vite dev server only"
	@echo "  make bot          Start Telegram bot"
	@echo "  make seed         Seed DB with dev data (no API keys needed)"
	@echo "  make test         Run backend unit tests"
	@echo "  make docker-up    Start full stack via Docker Compose"
	@echo "  make docker-down  Stop Docker services"
	@echo "  make clean        Remove __pycache__, .pyc, dist/"
	@echo ""

# ── Development ───────────────────────────────────────────────────────────────
dev:
	@echo "Starting backend and frontend..."
	@(cd backend && uvicorn app.main:app --reload --port 8000) &
	@(cd frontend && npm run dev)

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

bot:
	cd telegram_bot && python bot.py

# ── Database ──────────────────────────────────────────────────────────────────
seed:
	@echo "Seeding dev database…"
	cd backend && python scripts/seed_dev_data.py

# ── Testing ───────────────────────────────────────────────────────────────────
test:
	cd backend && python -m pytest tests/ -v --tb=short

test-watch:
	cd backend && python -m pytest tests/ -v -f

# ── Docker ────────────────────────────────────────────────────────────────────
docker-up:
	@[ -f backend/.env ] || (echo "❌ backend/.env not found. Copy backend/.env.example first." && exit 1)
	docker compose up --build -d
	@echo "✅ Stack running:"
	@echo "   Frontend → http://localhost:3000"
	@echo "   Backend  → http://localhost:8000"
	@echo "   API docs → http://localhost:8000/docs"

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

# ── Setup ─────────────────────────────────────────────────────────────────────
install:
	@echo "Installing backend dependencies…"
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies…"
	cd frontend && npm install
	@echo "Installing Telegram bot dependencies…"
	cd telegram_bot && pip install -r requirements.txt
	@echo "✅ All dependencies installed."

setup: install
	@[ -f backend/.env ] || (cp backend/.env.example backend/.env && echo "📄 Created backend/.env — add your API keys")
	@[ -f frontend/.env.local ] || (cp frontend/.env.example frontend/.env.local && echo "📄 Created frontend/.env.local")
	@echo "✅ Setup complete. Run: make seed && make dev"

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name "*.db"  -delete 2>/dev/null || true
	rm -rf frontend/dist frontend/node_modules/.vite
	@echo "✅ Cleaned."
