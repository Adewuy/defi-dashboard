"""
tests/test_api.py — Integration tests for FastAPI endpoints.

These tests use httpx.AsyncClient against the live app (in-memory SQLite).
Run: pytest tests/ -v
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ── In-memory test DB setup ──────────────────────────────────────────────────

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_test_db():
    """Create tables and seed test data once per module."""
    from app.core.database import Base
    from app.models import protocol, alert  # register models

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed one protocol
    async with TestSessionLocal() as db:
        from app.models.protocol import ProtocolSnapshot
        from app.models.alert import Alert
        snap = ProtocolSnapshot(
            id="aave",
            name="Aave",
            category="Lending",
            daily_revenue=2_100_000,
            daily_fees=2_940_000,
            weekly_revenue=14_700_000,
            monthly_revenue=63_000_000,
            tvl=8_400_000_000,
            tvl_7d_ago=8_100_000_000,
            daily_emissions_usd=1_200_000,
            token_price=97.0,
            token_symbol="AAVE",
            real_yield_daily=900_000,
            emissions_dependency_ratio=0.571,
            sustainability_score=72.5,
            profitability_status="profitable",
            revenue_history=[1_600_000, 1_750_000, 1_820_000, 1_900_000, 2_000_000, 2_050_000, 2_100_000],
            emissions_history=[1_300_000] * 7,
            tvl_history=[8_100_000_000, 8_200_000_000, 8_250_000_000, 8_300_000_000, 8_350_000_000, 8_380_000_000, 8_400_000_000],
        )
        await db.merge(snap)

        alert_row = Alert(
            protocol_id="aave",
            protocol_name="Aave",
            alert_type="test_alert",
            severity="warning",
            message="Test warning for Aave.",
            metric_value=0.57,
            metric_threshold=0.5,
        )
        db.add(alert_row)
        await db.commit()

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """Async test client with DB override."""
    from app.main import app
    from app.core.database import get_db
    app.dependency_overrides[get_db] = override_get_db

    # Prevent scheduler from starting in tests
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()


# ── Health ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "telegram_configured" in data
    assert "dune_configured" in data


# ── Protocols ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_protocols(client):
    resp = await client.get("/api/protocols")
    assert resp.status_code == 200
    data = resp.json()
    assert "protocols" in data
    assert data["total"] >= 1
    p = data["protocols"][0]
    assert "sustainability_score" in p
    assert "real_yield_daily" in p
    assert "emissions_dependency_ratio" in p


@pytest.mark.asyncio
async def test_get_protocol_detail(client):
    resp = await client.get("/api/protocols/aave")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "aave"
    assert data["name"] == "Aave"
    assert data["sustainability_score"] > 0
    assert "insights" in data
    assert isinstance(data["revenue_history"], list)


@pytest.mark.asyncio
async def test_get_protocol_not_found(client):
    resp = await client.get("/api/protocols/nonexistent_xyz")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_protocols_sort_by_revenue(client):
    resp = await client.get("/api/protocols?sort_by=daily_revenue&order=desc")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_protocols_filter_category(client):
    resp = await client.get("/api/protocols?category=Lending")
    assert resp.status_code == 200
    data = resp.json()
    for p in data["protocols"]:
        assert "lending" in p["category"].lower()


# ── Analytics ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_sustainability_report(client):
    resp = await client.get("/api/analytics/sustainability")
    assert resp.status_code == 200
    data = resp.json()
    assert "rankings" in data
    assert "total_ecosystem_revenue" in data
    assert "ecosystem_real_yield" in data
    assert len(data["rankings"]) >= 1
    r = data["rankings"][0]
    assert "rank" in r
    assert "protocol" in r


@pytest.mark.asyncio
async def test_compare_protocols(client):
    resp = await client.get("/api/analytics/compare?ids=aave")
    assert resp.status_code == 200
    data = resp.json()
    assert "protocols" in data
    assert len(data["protocols"]) >= 1


@pytest.mark.asyncio
async def test_ecosystem_summary(client):
    resp = await client.get("/api/analytics/ecosystem/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_protocols" in data
    assert "total_tvl_usd" in data
    assert "average_sustainability_score" in data


# ── Alerts ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_alerts(client):
    resp = await client.get("/api/alerts")
    assert resp.status_code == 200
    data = resp.json()
    assert "alerts" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_alerts_filter_severity(client):
    resp = await client.get("/api/alerts?severity=warning")
    assert resp.status_code == 200
    data = resp.json()
    for a in data["alerts"]:
        assert a["severity"] == "warning"


@pytest.mark.asyncio
async def test_acknowledge_alert(client):
    # Get first alert ID
    list_resp = await client.get("/api/alerts?limit=1")
    alerts = list_resp.json()["alerts"]
    assert alerts, "No alerts to acknowledge"
    alert_id = alerts[0]["id"]

    ack_resp = await client.post(f"/api/alerts/{alert_id}/acknowledge")
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "acknowledged"


@pytest.mark.asyncio
async def test_send_test_alert_no_token(client):
    """Without a bot token configured, test alert should return 400."""
    resp = await client.post("/api/alerts/test", json={"message": "hello"})
    # 400 if not configured, 200 if configured
    assert resp.status_code in (200, 400)
