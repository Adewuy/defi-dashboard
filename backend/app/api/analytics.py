"""
app/api/analytics.py — Aggregated analytics endpoints.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.protocol import ProtocolSnapshot
from app.api.schemas import (
    SustainabilityReport,
    SustainabilityRanking,
    ProtocolComparison,
    ProtocolDetail,
    ProtocolSummary,
    ScoreComponents,
)
from app.analytics.engine import (
    SustainabilityInputs,
    compute_sustainability_score,
    classify_score,
    pct_change,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/sustainability", response_model=SustainabilityReport)
async def get_sustainability_report(db: AsyncSession = Depends(get_db)):
    """Full sustainability ranking of all tracked protocols."""
    result = await db.execute(select(ProtocolSnapshot))
    snaps = result.scalars().all()

    if not snaps:
        raise HTTPException(status_code=503, detail="No data available yet. Wait for pipeline to run.")

    # Sort by sustainability score descending
    sorted_snaps = sorted(snaps, key=lambda s: s.sustainability_score, reverse=True)

    # Sub-rankings
    rev_sorted = sorted(snaps, key=lambda s: s.daily_revenue, reverse=True)
    tvl_sorted = sorted(snaps, key=lambda s: s.tvl, reverse=True)
    em_sorted = sorted(snaps, key=lambda s: s.emissions_dependency_ratio)  # lower = better

    rev_rank_map = {s.id: i + 1 for i, s in enumerate(rev_sorted)}
    tvl_rank_map = {s.id: i + 1 for i, s in enumerate(tvl_sorted)}
    em_rank_map = {s.id: i + 1 for i, s in enumerate(em_sorted)}

    rankings = []
    for rank, snap in enumerate(sorted_snaps, 1):
        tvl_change = pct_change(snap.tvl, snap.tvl_7d_ago)
        summary = ProtocolSummary(
            **{k: v for k, v in snap.__dict__.items() if k in ProtocolSummary.model_fields},
            tvl_change_pct=round(tvl_change, 2),
            score_status=classify_score(snap.sustainability_score),
        )
        rankings.append(SustainabilityRanking(
            rank=rank,
            protocol=summary,
            real_yield_rank=rev_rank_map.get(snap.id, 0),
            tvl_rank=tvl_rank_map.get(snap.id, 0),
            emissions_rank=em_rank_map.get(snap.id, 0),
        ))

    total_rev = sum(s.daily_revenue for s in snaps)
    total_emis = sum(s.daily_emissions_usd for s in snaps)

    return SustainabilityReport(
        rankings=rankings,
        healthy_count=sum(1 for s in snaps if s.sustainability_score >= 80),
        warning_count=sum(1 for s in snaps if 40 <= s.sustainability_score < 60),
        high_risk_count=sum(1 for s in snaps if s.sustainability_score < 40),
        total_ecosystem_revenue=total_rev,
        total_ecosystem_emissions=total_emis,
        ecosystem_real_yield=total_rev - total_emis,
        generated_at=datetime.now(timezone.utc),
    )


@router.get("/compare", response_model=ProtocolComparison)
async def compare_protocols(
    ids: str = Query(..., description="Comma-separated protocol slugs, e.g. aave,gmx,lido"),
    db: AsyncSession = Depends(get_db),
):
    """Side-by-side comparison of multiple protocols."""
    slug_list = [s.strip() for s in ids.split(",") if s.strip()][:6]  # max 6

    results = []
    for slug in slug_list:
        snap = await db.get(ProtocolSnapshot, slug)
        if not snap:
            continue
        inputs = SustainabilityInputs(
            daily_revenue=snap.daily_revenue,
            daily_emissions=snap.daily_emissions_usd,
            tvl_current=snap.tvl,
            tvl_7d_ago=snap.tvl_7d_ago,
            revenue_history=snap.revenue_history or [],
            emissions_history=snap.emissions_history or [],
            tvl_history=snap.tvl_history or [],
        )
        analytics = compute_sustainability_score(inputs)
        tvl_change = pct_change(snap.tvl, snap.tvl_7d_ago)
        summary = ProtocolSummary(
            **{k: v for k, v in snap.__dict__.items() if k in ProtocolSummary.model_fields},
            tvl_change_pct=round(tvl_change, 2),
            score_status=classify_score(snap.sustainability_score),
        )
        detail = ProtocolDetail(
            **summary.model_dump(),
            revenue_history=snap.revenue_history or [],
            emissions_history=snap.emissions_history or [],
            tvl_history=snap.tvl_history or [],
            insights=analytics.insights,
            score_components=ScoreComponents(**analytics.component_scores),
        )
        results.append(detail)

    return ProtocolComparison(protocols=results, comparison_date=datetime.now(timezone.utc))


@router.get("/ecosystem/summary")
async def ecosystem_summary(db: AsyncSession = Depends(get_db)):
    """High-level ecosystem health numbers."""
    result = await db.execute(select(ProtocolSnapshot))
    snaps = result.scalars().all()
    if not snaps:
        return {}

    total_tvl = sum(s.tvl for s in snaps)
    total_rev = sum(s.daily_revenue for s in snaps)
    total_emis = sum(s.daily_emissions_usd for s in snaps)
    avg_score = sum(s.sustainability_score for s in snaps) / len(snaps)

    by_status = {}
    for s in snaps:
        status = classify_score(s.sustainability_score)
        by_status.setdefault(status, 0)
        by_status[status] += 1

    return {
        "total_protocols": len(snaps),
        "total_tvl_usd": total_tvl,
        "total_daily_revenue_usd": total_rev,
        "total_daily_emissions_usd": total_emis,
        "ecosystem_real_yield_usd": total_rev - total_emis,
        "average_sustainability_score": round(avg_score, 1),
        "protocols_by_status": by_status,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
