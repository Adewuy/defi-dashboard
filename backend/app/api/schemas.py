"""
app/api/schemas.py — Pydantic response/request models for the API layer.
"""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


# ── Shared ────────────────────────────────────────────────────────────────────

class ScoreComponents(BaseModel):
    real_yield: float
    emissions_dependency: float
    revenue_trend: float
    tvl_trend: float
    user_activity: float


# ── Protocol ──────────────────────────────────────────────────────────────────

class ProtocolSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str

    daily_revenue: float
    daily_fees: float
    weekly_revenue: float
    monthly_revenue: float

    tvl: float
    tvl_7d_ago: float
    tvl_change_pct: float = 0.0

    daily_emissions_usd: float
    token_price: float
    token_symbol: str

    real_yield_daily: float
    emissions_dependency_ratio: float
    sustainability_score: float
    profitability_status: str
    score_status: str = ""

    last_updated: datetime


class ProtocolDetail(ProtocolSummary):
    revenue_history: list[float] = Field(default_factory=list)
    emissions_history: list[float] = Field(default_factory=list)
    tvl_history: list[float] = Field(default_factory=list)
    insights: list[str] = Field(default_factory=list)
    score_components: ScoreComponents | None = None


class ProtocolListResponse(BaseModel):
    protocols: list[ProtocolSummary]
    total: int
    last_refreshed: datetime | None


# ── History ───────────────────────────────────────────────────────────────────

class HistoryPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: datetime
    daily_revenue: float
    daily_fees: float
    daily_emissions_usd: float
    tvl: float
    token_price: float
    real_yield: float
    sustainability_score: float
    emissions_dependency_ratio: float


# ── Analytics ─────────────────────────────────────────────────────────────────

class ProtocolComparison(BaseModel):
    protocols: list[ProtocolDetail]
    comparison_date: datetime


class SustainabilityRanking(BaseModel):
    rank: int
    protocol: ProtocolSummary
    real_yield_rank: int
    tvl_rank: int
    emissions_rank: int


class SustainabilityReport(BaseModel):
    rankings: list[SustainabilityRanking]
    healthy_count: int
    warning_count: int
    high_risk_count: int
    total_ecosystem_revenue: float
    total_ecosystem_emissions: float
    ecosystem_real_yield: float
    generated_at: datetime


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    protocol_id: str
    protocol_name: str
    alert_type: str
    severity: str
    message: str
    metric_value: float
    metric_threshold: float
    sent_to_telegram: bool
    acknowledged: bool
    created_at: datetime


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int
    critical_count: int
    warning_count: int


class TelegramTestRequest(BaseModel):
    message: str = "🧪 Test alert from DeFi Sustainability Dashboard."
    protocol_id: str = "test"


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    environment: str
    database: str
    telegram_configured: bool
    dune_configured: bool
    last_pipeline_run: datetime | None
