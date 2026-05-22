# DeFi Protocol Revenue & Sustainability Dashboard

A full-stack DeFi analytics platform that evaluates protocol revenue sustainability by comparing real protocol revenue against token emissions and incentive spending.

## Architecture

```
defi-dashboard/
├── backend/          # FastAPI backend + analytics engine
├── frontend/         # React dashboard
├── telegram_bot/     # Telegram alert bot
└── docs/             # Documentation
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Redis (for caching & task queue)
- Telegram Bot Token (optional)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your API keys
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local      # Set VITE_API_URL=http://localhost:8000
npm run dev
```

### 3. Telegram Bot Setup

```bash
cd telegram_bot
pip install -r requirements.txt
# Add TELEGRAM_BOT_TOKEN to backend/.env
python bot.py
```

## Environment Variables

### Backend `.env`

```env
# Required
COINGECKO_API_KEY=your_key_here         # Free tier works; Pro for higher limits

# Optional — improves data quality
DUNE_API_KEY=your_dune_key
THE_GRAPH_API_KEY=your_graph_key
ALCHEMY_API_KEY=your_alchemy_key

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id           # Channel or user ID for alerts

# App
REDIS_URL=redis://localhost:6379
DATABASE_URL=sqlite:///./defi_analytics.db
SECRET_KEY=change_me_in_production
ENVIRONMENT=development

# Alert thresholds (optional overrides)
ALERT_EMISSIONS_RATIO_THRESHOLD=1.0
ALERT_SCORE_DROP_THRESHOLD=10
ALERT_TVL_DROP_PCT=5.0
```

## API Overview

| Endpoint | Description |
|---|---|
| `GET /api/protocols` | All tracked protocols with scores |
| `GET /api/protocols/{id}` | Single protocol detail |
| `GET /api/protocols/{id}/history` | Historical metrics |
| `GET /api/analytics/sustainability` | Sustainability rankings |
| `GET /api/analytics/compare?ids=aave,gmx` | Side-by-side comparison |
| `GET /api/alerts` | Recent risk alerts |
| `POST /api/alerts/test` | Trigger test Telegram alert |
| `GET /api/health` | Health check |

## Scoring Methodology

The sustainability score (0–100) weights five signals:

| Signal | Weight | Direction |
|---|---|---|
| Real Yield (Revenue − Emissions) | 30% | Higher = better |
| Emissions Dependency Ratio | 25% | Lower = better |
| Revenue Trend (7d) | 20% | Growing = better |
| TVL Trend (7d) | 15% | Growing = better |
| User Activity Trend | 10% | Growing = better |

Score bands: **Healthy** ≥ 80 · **Stable** 60–79 · **Warning** 40–59 · **High Risk** < 40

## Alert Triggers

Alerts fire when:
- Emissions exceed revenue (ratio > 1.0)
- Sustainability score drops ≥ 10 points in 24h
- TVL declines > 5% in 7 days
- Real yield turns negative
- Revenue drops > 20% week-over-week
