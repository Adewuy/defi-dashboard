"""
app/models/protocol.py — ORM models for protocol snapshots and history.
"""
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProtocolSnapshot(Base):
    """Latest metrics snapshot for a protocol — one row per protocol, upserted on refresh."""
    __tablename__ = "protocol_snapshots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)          # DeFiLlama slug
    name: Mapped[str] = mapped_column(String(128))
    category: Mapped[str] = mapped_column(String(64), default="")

    # Revenue & fees (USD, 24h)
    daily_revenue: Mapped[float] = mapped_column(Float, default=0.0)
    daily_fees: Mapped[float] = mapped_column(Float, default=0.0)
    weekly_revenue: Mapped[float] = mapped_column(Float, default=0.0)
    monthly_revenue: Mapped[float] = mapped_column(Float, default=0.0)

    # TVL
    tvl: Mapped[float] = mapped_column(Float, default=0.0)
    tvl_7d_ago: Mapped[float] = mapped_column(Float, default=0.0)

    # Emissions (USD equivalent per day, estimated)
    daily_emissions_usd: Mapped[float] = mapped_column(Float, default=0.0)
    token_price: Mapped[float] = mapped_column(Float, default=0.0)
    token_symbol: Mapped[str] = mapped_column(String(16), default="")

    # Computed analytics
    real_yield_daily: Mapped[float] = mapped_column(Float, default=0.0)
    emissions_dependency_ratio: Mapped[float] = mapped_column(Float, default=0.0)
    sustainability_score: Mapped[float] = mapped_column(Float, default=50.0)
    profitability_status: Mapped[str] = mapped_column(String(16), default="unknown")

    # Raw history arrays stored as JSON for charting (last 30 days)
    revenue_history: Mapped[list] = mapped_column(JSON, default=list)
    emissions_history: Mapped[list] = mapped_column(JSON, default=list)
    tvl_history: Mapped[list] = mapped_column(JSON, default=list)

    # Meta
    last_updated: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    data_source: Mapped[str] = mapped_column(String(64), default="defillama")


class ProtocolHistory(Base):
    """Time-series history — one row per protocol per day."""
    __tablename__ = "protocol_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    protocol_id: Mapped[str] = mapped_column(String(64), index=True)
    date: Mapped[datetime] = mapped_column(DateTime, index=True)

    daily_revenue: Mapped[float] = mapped_column(Float, default=0.0)
    daily_fees: Mapped[float] = mapped_column(Float, default=0.0)
    daily_emissions_usd: Mapped[float] = mapped_column(Float, default=0.0)
    tvl: Mapped[float] = mapped_column(Float, default=0.0)
    token_price: Mapped[float] = mapped_column(Float, default=0.0)
    real_yield: Mapped[float] = mapped_column(Float, default=0.0)
    sustainability_score: Mapped[float] = mapped_column(Float, default=50.0)
    emissions_dependency_ratio: Mapped[float] = mapped_column(Float, default=0.0)
