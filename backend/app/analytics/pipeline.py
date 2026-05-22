"""
app/analytics/pipeline.py — Orchestrates data fetching → analytics → persistence.

Called by the APScheduler background job every N minutes.
"""
import asyncio
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.protocol import ProtocolSnapshot, ProtocolHistory
from app.models.alert import Alert
from app.services.defillama import defillama_service
from app.services.coingecko import coingecko_service
from app.services.dune import dune_service
from app.analytics.engine import (
    SustainabilityInputs,
    compute_sustainability_score,
    generate_risk_alerts,
    classify_profitability,
    calculate_real_yield,
    calculate_emissions_dependency_ratio,
)

logger = get_logger(__name__)
settings = get_settings()

# Estimated daily token emission rates (tokens/day) — conservative defaults.
# These are protocol-level rough estimates; replace with Dune/on-chain data for precision.
EMISSION_ESTIMATES: dict[str, float] = {
    "aave":      3_000,    # AAVE/day (Safety Module + liquidity mining)
    "uniswap":   50_000,   # UNI/day (grants / ecosystem)
    "gmx":       1_200,    # GMX/day (esGMX rewards)
    "curve":     600_000,  # CRV/day (gauge emissions)
    "compound":  2_000,    # COMP/day
    "lido":      0,        # Lido doesn't emit LDO as protocol incentive directly
    "synthetix": 25_000,   # SNX/day (staking rewards)
    "frax":      5_000,    # FXS/day
    "maker":     0,        # MKR buyback model — no emissions
    "convex":    70_000,   # CVX/day
}


async def run_pipeline(db: AsyncSession) -> dict:
    """
    Full data refresh pipeline:
    1. Fetch token prices from CoinGecko
    2. Fetch fees overview from DeFiLlama
    3. Per protocol: fetch detail, compute analytics, upsert snapshot
    4. Save daily history row
    5. Generate and persist alerts
    Returns summary stats.
    """
    logger.info("pipeline_start")
    start = datetime.now(timezone.utc)
    results = {"refreshed": 0, "alerts_generated": 0, "errors": []}

    # ── Step 1: Token prices ─────────────────────────────────────────────────
    token_ids = list(settings.protocol_token_ids.values())
    try:
        token_prices = await coingecko_service.get_prices(token_ids)
        logger.info("coingecko_prices_fetched", count=len(token_prices))
    except Exception as e:
        logger.error("coingecko_error", error=str(e))
        token_prices = {}

    # Build reverse map: coingecko_id → slug
    cg_id_to_slug = {v: k for k, v in settings.protocol_token_ids.items()}

    # ── Step 2: DeFiLlama overview ───────────────────────────────────────────
    try:
        fees_overview = await defillama_service.get_fees_overview()
        overview_by_slug = {p.get("slug", p.get("name", "")).lower(): p for p in fees_overview}
        logger.info("defillama_overview_fetched", count=len(fees_overview))
    except Exception as e:
        logger.error("defillama_overview_error", error=str(e))
        overview_by_slug = {}

    # ── Step 3: Per-protocol refresh ─────────────────────────────────────────
    for slug, display_name in settings.tracked_protocols.items():
        try:
            await _refresh_protocol(
                db=db,
                slug=slug,
                display_name=display_name,
                overview_data=overview_by_slug.get(slug, {}),
                token_prices=token_prices,
                results=results,
            )
            results["refreshed"] += 1
            await asyncio.sleep(0.5)   # light rate-limit courtesy delay
        except Exception as e:
            logger.error("protocol_refresh_error", slug=slug, error=str(e))
            results["errors"].append({"slug": slug, "error": str(e)})

    await db.commit()

    # ── Dispatch pending alerts to Telegram ──────────────────────────────────
    try:
        from app.services.alert_dispatcher import dispatch_pending_alerts
        dispatched = await dispatch_pending_alerts(db)
        results["alerts_dispatched"] = dispatched
    except Exception as e:
        logger.warning("alert_dispatch_error", error=str(e))

    elapsed = (datetime.now(timezone.utc) - start).total_seconds()
    logger.info("pipeline_complete", **results, elapsed_s=elapsed)
    return results


async def _refresh_protocol(
    db: AsyncSession,
    slug: str,
    display_name: str,
    overview_data: dict,
    token_prices: dict[str, float],
    results: dict,
) -> None:
    # ── Resolve token price ──────────────────────────────────────────────────
    cg_id = settings.protocol_token_ids.get(slug, "")
    token_price = token_prices.get(cg_id, 0.0)

    # ── Fetch per-protocol DeFiLlama data ────────────────────────────────────
    try:
        protocol_full = await defillama_service.fetch_protocol_full(slug)
    except Exception as e:
        logger.warning("defillama_protocol_error", slug=slug, error=str(e))
        protocol_full = {"fees": {}, "revenue": {}, "tvl": []}

    fees_data = protocol_full.get("fees", {})
    revenue_data = protocol_full.get("revenue", {})
    tvl_data = protocol_full.get("tvl", [])

    # ── Extract revenue series ───────────────────────────────────────────────
    revenue_chart = defillama_service.extract_daily_chart(revenue_data, "totalDataChart")
    fees_chart = defillama_service.extract_daily_chart(fees_data, "totalDataChart")

    revenue_history = defillama_service.get_last_n_days(revenue_chart, 30)
    daily_revenue = revenue_history[-1] if revenue_history else float(
        overview_data.get("total24h", 0) or 0
    )
    weekly_revenue = sum(revenue_history[-7:]) if revenue_history else daily_revenue * 7
    monthly_revenue = sum(revenue_history[-30:]) if revenue_history else daily_revenue * 30

    daily_fees = float(overview_data.get("total24h", daily_revenue) or daily_revenue)

    # ── Extract TVL series ───────────────────────────────────────────────────
    tvl_history_vals: list[float] = []
    if isinstance(tvl_data, list):
        tvl_history_vals = [float(e.get("totalLiquidityUSD", 0)) for e in tvl_data[-30:]]
    tvl_current = tvl_history_vals[-1] if tvl_history_vals else 0.0
    tvl_7d_ago = tvl_history_vals[-8] if len(tvl_history_vals) >= 8 else tvl_current

    # ── Emissions estimate ───────────────────────────────────────────────────
    # Try Dune first (on-chain data), fall back to static estimate
    dune_data = await dune_service.get_protocol_emissions(slug)
    if dune_data.get("daily_emissions_usd"):
        daily_emissions_usd = float(dune_data["daily_emissions_usd"])
    else:
        tokens_per_day = EMISSION_ESTIMATES.get(slug, 0)
        daily_emissions_usd = tokens_per_day * token_price

    # Build emissions history (approximated from price history * fixed token rate)
    tokens_per_day = EMISSION_ESTIMATES.get(slug, 0)
    emissions_history = [tokens_per_day * token_price] * len(revenue_history)

    # ── Run analytics ─────────────────────────────────────────────────────────
    inputs = SustainabilityInputs(
        daily_revenue=daily_revenue,
        daily_emissions=daily_emissions_usd,
        tvl_current=tvl_current,
        tvl_7d_ago=tvl_7d_ago,
        revenue_history=revenue_history,
        emissions_history=emissions_history,
        tvl_history=tvl_history_vals,
    )
    analytics = compute_sustainability_score(inputs)

    # ── Load previous snapshot for alert delta ───────────────────────────────
    prev_result = await db.get(ProtocolSnapshot, slug)
    previous_score = prev_result.sustainability_score if prev_result else None
    category = overview_data.get("category", fees_data.get("category", ""))

    # ── Upsert snapshot ───────────────────────────────────────────────────────
    snapshot = ProtocolSnapshot(
        id=slug,
        name=display_name,
        category=category,
        daily_revenue=daily_revenue,
        daily_fees=daily_fees,
        weekly_revenue=weekly_revenue,
        monthly_revenue=monthly_revenue,
        tvl=tvl_current,
        tvl_7d_ago=tvl_7d_ago,
        daily_emissions_usd=daily_emissions_usd,
        token_price=token_price,
        token_symbol=cg_id.upper()[:8],
        real_yield_daily=analytics.real_yield,
        emissions_dependency_ratio=analytics.emissions_dependency_ratio,
        sustainability_score=analytics.score,
        profitability_status=analytics.profitability,
        revenue_history=revenue_history,
        emissions_history=emissions_history,
        tvl_history=tvl_history_vals,
        last_updated=datetime.now(timezone.utc),
    )
    await db.merge(snapshot)

    # ── Save daily history row ─────────────────────────────────────────────
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    history_row = ProtocolHistory(
        protocol_id=slug,
        date=today,
        daily_revenue=daily_revenue,
        daily_fees=daily_fees,
        daily_emissions_usd=daily_emissions_usd,
        tvl=tvl_current,
        token_price=token_price,
        real_yield=analytics.real_yield,
        sustainability_score=analytics.score,
        emissions_dependency_ratio=analytics.emissions_dependency_ratio,
    )
    db.add(history_row)

    # ── Generate alerts ────────────────────────────────────────────────────
    thresholds = {
        "emissions_ratio": settings.alert_emissions_ratio_threshold,
        "score_drop": settings.alert_score_drop_threshold,
        "tvl_drop_pct": settings.alert_tvl_drop_pct,
    }
    alerts = generate_risk_alerts(slug, display_name, analytics, previous_score, thresholds)
    for a in alerts:
        alert_row = Alert(
            protocol_id=a.protocol_id,
            protocol_name=a.protocol_name,
            alert_type=a.alert_type,
            severity=a.severity,
            message=a.message,
            metric_value=a.metric_value,
            metric_threshold=a.metric_threshold,
        )
        db.add(alert_row)
        results["alerts_generated"] += 1

    logger.info(
        "protocol_refreshed",
        slug=slug,
        score=analytics.score,
        status=analytics.status,
        real_yield=analytics.real_yield,
        alerts=len(alerts),
    )
