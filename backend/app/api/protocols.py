"""
app/api/protocols.py — Protocol data endpoints.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.protocol import ProtocolSnapshot, ProtocolHistory
from app.api.schemas import (
    ProtocolDetail,
    ProtocolListResponse,
    ProtocolSummary,
    HistoryPoint,
)
from app.analytics.engine import (
    SustainabilityInputs,
    compute_sustainability_score,
    classify_score,
    pct_change,
)

router = APIRouter(prefix="/api/protocols", tags=["protocols"])


def _enrich_summary(snap: ProtocolSnapshot) -> ProtocolSummary:
    tvl_change = pct_change(snap.tvl, snap.tvl_7d_ago) if snap.tvl_7d_ago else 0.0
    d = snap.__dict__
    return ProtocolSummary(
        **{k: v for k, v in d.items() if k in ProtocolSummary.model_fields},
        tvl_change_pct=round(tvl_change, 2),
        score_status=classify_score(snap.sustainability_score),
    )


@router.get("", response_model=ProtocolListResponse)
async def list_protocols(
    category: str | None = Query(None, description="Filter by category"),
    sort_by: str = Query("sustainability_score", description="sort field"),
    order: str = Query("desc", description="asc | desc"),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ProtocolSnapshot)
    if category:
        stmt = stmt.where(ProtocolSnapshot.category.ilike(f"%{category}%"))

    sort_col = getattr(ProtocolSnapshot, sort_by, ProtocolSnapshot.sustainability_score)
    stmt = stmt.order_by(desc(sort_col) if order == "desc" else sort_col)
    stmt = stmt.limit(limit)

    result = await db.execute(stmt)
    snaps = result.scalars().all()

    last_updated = max((s.last_updated for s in snaps), default=None) if snaps else None

    return ProtocolListResponse(
        protocols=[_enrich_summary(s) for s in snaps],
        total=len(snaps),
        last_refreshed=last_updated,
    )


@router.get("/{protocol_id}", response_model=ProtocolDetail)
async def get_protocol(protocol_id: str, db: AsyncSession = Depends(get_db)):
    snap = await db.get(ProtocolSnapshot, protocol_id)
    if not snap:
        raise HTTPException(status_code=404, detail=f"Protocol '{protocol_id}' not found")

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

    from app.api.schemas import ScoreComponents
    summary = _enrich_summary(snap)

    return ProtocolDetail(
        **summary.model_dump(),
        revenue_history=snap.revenue_history or [],
        emissions_history=snap.emissions_history or [],
        tvl_history=snap.tvl_history or [],
        insights=analytics.insights,
        score_components=ScoreComponents(**analytics.component_scores),
    )


@router.get("/{protocol_id}/history", response_model=list[HistoryPoint])
async def get_protocol_history(
    protocol_id: str,
    days: int = Query(30, le=365, description="Number of days of history"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ProtocolHistory)
        .where(ProtocolHistory.protocol_id == protocol_id)
        .order_by(desc(ProtocolHistory.date))
        .limit(days)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No history found for '{protocol_id}'")
    return list(reversed(rows))
