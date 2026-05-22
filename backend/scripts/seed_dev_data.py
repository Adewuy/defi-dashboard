"""
scripts/seed_dev_data.py — Populates the database with realistic mock data
so the frontend works without real API keys.

Run from backend/: python scripts/seed_dev_data.py
"""
import asyncio
import sys
import math
import random
from datetime import datetime, timezone, timedelta

sys.path.insert(0, ".")

from app.core.database import init_db, AsyncSessionLocal
from app.models.protocol import ProtocolSnapshot, ProtocolHistory
from app.models.alert import Alert
from app.analytics.engine import (
    SustainabilityInputs,
    compute_sustainability_score,
    generate_risk_alerts,
)

random.seed(42)

PROTOCOLS = [
    dict(id="lido",      name="Lido",           category="Staking",     base_rev=4_200_000, base_emis=1_100_000, tvl=21_000_000_000, token_price=2.10,  symbol="LDO",  tokens_day=0),
    dict(id="gmx",       name="GMX",            category="Perps",       base_rev=1_850_000, base_emis=420_000,   tvl=580_000_000,    token_price=27.50, symbol="GMX",  tokens_day=1_200),
    dict(id="aave",      name="Aave",           category="Lending",     base_rev=2_100_000, base_emis=1_200_000, tvl=8_400_000_000,  token_price=97.00, symbol="AAVE", tokens_day=3_000),
    dict(id="uniswap",   name="Uniswap",        category="DEX",         base_rev=3_200_000, base_emis=2_800_000, tvl=5_100_000_000,  token_price=10.20, symbol="UNI",  tokens_day=50_000),
    dict(id="frax",      name="Frax",           category="Stablecoin",  base_rev=780_000,   base_emis=640_000,   tvl=1_200_000_000,  token_price=4.30,  symbol="FXS",  tokens_day=5_000),
    dict(id="maker",     name="MakerDAO",       category="Stablecoin",  base_rev=2_500_000, base_emis=0,         tvl=7_800_000_000,  token_price=2_100, symbol="MKR",  tokens_day=0),
    dict(id="compound",  name="Compound",       category="Lending",     base_rev=620_000,   base_emis=980_000,   tvl=1_800_000_000,  token_price=55.00, symbol="COMP", tokens_day=2_000),
    dict(id="curve",     name="Curve Finance",  category="DEX",         base_rev=890_000,   base_emis=1_940_000, tvl=2_300_000_000,  token_price=0.38,  symbol="CRV",  tokens_day=600_000),
    dict(id="synthetix", name="Synthetix",      category="Derivatives", base_rev=410_000,   base_emis=890_000,   tvl=420_000_000,    token_price=2.60,  symbol="SNX",  tokens_day=25_000),
    dict(id="convex",    name="Convex Finance", category="Yield",       base_rev=540_000,   base_emis=1_200_000, tvl=1_100_000_000,  token_price=2.10,  symbol="CVX",  tokens_day=70_000),
]


def _jitter(base: float, pct: float = 0.08) -> float:
    return base * (1 + random.uniform(-pct, pct))


def _trend(base: float, days: int, slope: float = 0.004, noise: float = 0.05) -> list[float]:
    """Generate a time series with a trend + noise."""
    return [max(0, _jitter(base * (1 + slope * i), noise)) for i in range(days)]


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        print("Seeding protocols…")

        for p in PROTOCOLS:
            DAYS = 30
            rev_hist   = _trend(p["base_rev"],   DAYS, slope=random.uniform(-0.005, 0.008))
            emis_hist  = _trend(p["base_emis"],  DAYS, slope=random.uniform(-0.003, 0.003))
            tvl_hist   = _trend(p["tvl"],        DAYS, slope=random.uniform(-0.004, 0.007))

            daily_rev  = rev_hist[-1]
            daily_emis = emis_hist[-1]
            tvl_now    = tvl_hist[-1]
            tvl_7d_ago = tvl_hist[-8] if len(tvl_hist) >= 8 else tvl_now

            inputs = SustainabilityInputs(
                daily_revenue=daily_rev,
                daily_emissions=daily_emis,
                tvl_current=tvl_now,
                tvl_7d_ago=tvl_7d_ago,
                revenue_history=rev_hist,
                emissions_history=emis_hist,
                tvl_history=tvl_hist,
            )
            result = compute_sustainability_score(inputs)

            snap = ProtocolSnapshot(
                id=p["id"],
                name=p["name"],
                category=p["category"],
                daily_revenue=daily_rev,
                daily_fees=daily_rev * 1.4,
                weekly_revenue=sum(rev_hist[-7:]),
                monthly_revenue=sum(rev_hist),
                tvl=tvl_now,
                tvl_7d_ago=tvl_7d_ago,
                daily_emissions_usd=daily_emis,
                token_price=p["token_price"],
                token_symbol=p["symbol"],
                real_yield_daily=result.real_yield,
                emissions_dependency_ratio=result.emissions_dependency_ratio,
                sustainability_score=result.score,
                profitability_status=result.profitability,
                revenue_history=rev_hist,
                emissions_history=emis_hist,
                tvl_history=tvl_hist,
                last_updated=now,
                data_source="seed",
            )
            await db.merge(snap)

            # History rows
            for i, (rev, emis, tvl_v) in enumerate(zip(rev_hist, emis_hist, tvl_hist)):
                day = now - timedelta(days=DAYS - i - 1)
                row = ProtocolHistory(
                    protocol_id=p["id"],
                    date=day.replace(hour=0, minute=0, second=0, microsecond=0),
                    daily_revenue=rev,
                    daily_fees=rev * 1.4,
                    daily_emissions_usd=emis,
                    tvl=tvl_v,
                    token_price=p["token_price"],
                    real_yield=rev - emis,
                    sustainability_score=result.score + random.uniform(-5, 5),
                    emissions_dependency_ratio=emis / max(rev, 1),
                )
                db.add(row)

            # Alerts
            thresholds = {"emissions_ratio": 1.0, "score_drop": 10.0}
            prev_score = result.score + random.uniform(-15, 5)
            alerts = generate_risk_alerts(p["id"], p["name"], result, prev_score, thresholds)
            for a in alerts:
                db.add(Alert(
                    protocol_id=a.protocol_id,
                    protocol_name=a.protocol_name,
                    alert_type=a.alert_type,
                    severity=a.severity,
                    message=a.message,
                    metric_value=a.metric_value,
                    metric_threshold=a.metric_threshold,
                    created_at=now - timedelta(minutes=random.randint(1, 120)),
                ))

            score_str = f"{result.score:.0f} ({result.status})"
            yield_str = f"+${result.real_yield/1e3:.0f}K" if result.real_yield >= 0 else f"-${abs(result.real_yield)/1e3:.0f}K"
            print(f"  ✅ {p['name']:<18} score={score_str:<20} real_yield={yield_str}/day  alerts={len(alerts)}")

        await db.commit()
        print("\n✅ Seed complete — database ready for development.")
        print("   Start the backend: uvicorn app.main:app --reload --port 8000")


if __name__ == "__main__":
    asyncio.run(seed())
