"""
app/analytics/engine.py — Core analytics computations.

All pure functions — no I/O, easily testable.
"""
from dataclasses import dataclass, field
from typing import Literal
import math


# ── Score classification ─────────────────────────────────────────────────────

ScoreStatus = Literal["healthy", "stable", "warning", "high_risk"]
ProfitStatus = Literal["profitable", "break_even", "unprofitable", "unknown"]
TrendDirection = Literal["improving", "stable", "declining"]


def classify_score(score: float) -> ScoreStatus:
    if score >= 80:
        return "healthy"
    if score >= 60:
        return "stable"
    if score >= 40:
        return "warning"
    return "high_risk"


def classify_profitability(revenue: float, emissions: float) -> ProfitStatus:
    if revenue <= 0:
        return "unknown"
    net = revenue - emissions
    ratio = abs(net) / revenue
    if net > 0 and ratio > 0.05:
        return "profitable"
    if ratio <= 0.05:
        return "break_even"
    return "unprofitable"


# ── Real yield ───────────────────────────────────────────────────────────────

def calculate_real_yield(revenue: float, emissions: float) -> float:
    """Net value created after subtracting token incentive costs."""
    return revenue - emissions


def calculate_emissions_dependency_ratio(emissions: float, revenue: float) -> float:
    """How much of growth is subsidised. > 1.0 = unsustainable."""
    if revenue <= 0:
        return float("inf")
    return round(emissions / revenue, 4)


# ── Growth rates ─────────────────────────────────────────────────────────────

def pct_change(current: float, previous: float) -> float:
    """Percentage change, capped at ±500% to avoid division artifacts."""
    if previous == 0:
        return 0.0
    change = (current - previous) / abs(previous) * 100
    return max(-500.0, min(500.0, round(change, 2)))


def trend_direction(values: list[float], window: int = 7) -> TrendDirection:
    """
    Determine trend direction from the last `window` values using
    simple linear regression slope sign.
    """
    if len(values) < 2:
        return "stable"
    data = values[-window:]
    n = len(data)
    if n < 2:
        return "stable"
    x_mean = (n - 1) / 2
    y_mean = sum(data) / n
    numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(data))
    denominator = sum((i - x_mean) ** 2 for i in range(n))
    if denominator == 0:
        return "stable"
    slope = numerator / denominator
    # Normalise slope relative to mean
    if y_mean == 0:
        return "stable"
    normalised = slope / abs(y_mean)
    if normalised > 0.02:
        return "improving"
    if normalised < -0.02:
        return "declining"
    return "stable"


# ── Sustainability score ─────────────────────────────────────────────────────

@dataclass
class SustainabilityInputs:
    """All inputs needed to compute the sustainability score."""
    # Core financials
    daily_revenue: float = 0.0
    daily_emissions: float = 0.0

    # TVL
    tvl_current: float = 0.0
    tvl_7d_ago: float = 0.0

    # Historical series (30-day daily)
    revenue_history: list[float] = field(default_factory=list)
    emissions_history: list[float] = field(default_factory=list)
    tvl_history: list[float] = field(default_factory=list)

    # User activity (optional)
    users_current: int = 0
    users_7d_ago: int = 0


@dataclass
class SustainabilityResult:
    score: float
    status: ScoreStatus
    profitability: ProfitStatus
    real_yield: float
    emissions_dependency_ratio: float
    revenue_trend: TrendDirection
    tvl_trend: TrendDirection
    component_scores: dict[str, float]
    insights: list[str]


def compute_sustainability_score(inputs: SustainabilityInputs) -> SustainabilityResult:
    """
    Compute a 0–100 sustainability score from the five weighted signals.

    Weights:
      real_yield_score        30 %
      emissions_dep_score     25 %
      revenue_trend_score     20 %
      tvl_trend_score         15 %
      user_activity_score     10 %
    """
    rev = inputs.daily_revenue
    emis = inputs.daily_emissions

    # ── Signal 1: Real yield (30 pts) ────────────────────
    real_yield = calculate_real_yield(rev, emis)
    if rev > 0:
        ry_ratio = real_yield / rev          # -∞ … 1.0
        ry_score = 30 * _sigmoid(ry_ratio, steepness=4)
    else:
        ry_score = 0.0

    # ── Signal 2: Emissions dependency (25 pts) ──────────
    ed_ratio = calculate_emissions_dependency_ratio(emis, rev)
    if math.isinf(ed_ratio):
        ed_score = 0.0
    else:
        # ed_ratio=0 → 25 pts, ed_ratio=1 → ~12.5, ed_ratio=2 → ~0
        ed_score = 25 * max(0.0, 1 - (ed_ratio / 2))

    # ── Signal 3: Revenue trend (20 pts) ─────────────────
    rev_trend = trend_direction(inputs.revenue_history, window=7)
    rev_trend_score = {"improving": 20, "stable": 12, "declining": 4}[rev_trend]

    # ── Signal 4: TVL trend (15 pts) ─────────────────────
    tvl_change_pct = pct_change(inputs.tvl_current, inputs.tvl_7d_ago)
    if tvl_change_pct > 5:
        tvl_score = 15
    elif tvl_change_pct > -2:
        tvl_score = 10
    elif tvl_change_pct > -10:
        tvl_score = 5
    else:
        tvl_score = 0.0
    tvl_trend = trend_direction(inputs.tvl_history)

    # ── Signal 5: User activity (10 pts) ─────────────────
    user_change = pct_change(inputs.users_current, inputs.users_7d_ago)
    if inputs.users_current == 0 and inputs.users_7d_ago == 0:
        user_score = 7.0          # neutral — data unavailable
    elif user_change > 5:
        user_score = 10.0
    elif user_change > -5:
        user_score = 7.0
    else:
        user_score = 3.0

    total = ry_score + ed_score + rev_trend_score + tvl_score + user_score
    total = max(0.0, min(100.0, round(total, 1)))

    insights = _generate_insights(inputs, real_yield, ed_ratio, rev_trend, tvl_trend, tvl_change_pct)

    return SustainabilityResult(
        score=total,
        status=classify_score(total),
        profitability=classify_profitability(rev, emis),
        real_yield=round(real_yield, 2),
        emissions_dependency_ratio=round(ed_ratio, 4) if not math.isinf(ed_ratio) else 99.0,
        revenue_trend=rev_trend,
        tvl_trend=tvl_trend,
        component_scores={
            "real_yield": round(ry_score, 1),
            "emissions_dependency": round(ed_score, 1),
            "revenue_trend": round(rev_trend_score, 1),
            "tvl_trend": round(tvl_score, 1),
            "user_activity": round(user_score, 1),
        },
        insights=insights,
    )


def _sigmoid(x: float, steepness: float = 4) -> float:
    """Maps any real → (0, 1). x=0 → 0.5."""
    try:
        return 1 / (1 + math.exp(-steepness * x))
    except OverflowError:
        return 0.0 if x < 0 else 1.0


def _generate_insights(
    inputs: SustainabilityInputs,
    real_yield: float,
    ed_ratio: float,
    rev_trend: TrendDirection,
    tvl_trend: TrendDirection,
    tvl_change_pct: float,
) -> list[str]:
    """Generate human-readable predictive insight strings."""
    msgs: list[str] = []
    rev = inputs.daily_revenue
    emis = inputs.daily_emissions

    # Revenue insights
    if inputs.revenue_history and len(inputs.revenue_history) >= 7:
        rev_7d = pct_change(rev, inputs.revenue_history[-7] if len(inputs.revenue_history) >= 7 else rev)
        if rev_7d > 10:
            msgs.append(f"Protocol revenue increased {rev_7d:.0f}% over 7 days — strong growth signal.")
        elif rev_7d < -15:
            msgs.append(f"Protocol revenue declined {abs(rev_7d):.0f}% over 7 days — monitor closely.")

    # Emissions insights
    if inputs.emissions_history and len(inputs.emissions_history) >= 7:
        em_7d = pct_change(emis, inputs.emissions_history[-7] if len(inputs.emissions_history) >= 7 else emis)
        if em_7d < -10:
            msgs.append(f"Token emissions declined {abs(em_7d):.0f}% — emission dependency improving.")
        elif em_7d > 20:
            msgs.append(f"Token emissions increased {em_7d:.0f}% — watch for sustainability pressure.")

    # Real yield
    if real_yield > 0:
        msgs.append(f"Positive real yield of ${real_yield:,.0f}/day — protocol covers its own incentives.")
    else:
        msgs.append(f"Negative real yield of ${real_yield:,.0f}/day — protocol relies on token inflation.")

    # Emissions dependency
    if ed_ratio < 0.3:
        msgs.append("Emission dependency below 30% — revenue is largely organic.")
    elif ed_ratio > 1.5:
        msgs.append(f"Emissions are {ed_ratio:.1f}× revenue — growth is primarily incentive-driven.")
    elif ed_ratio > 1.0:
        msgs.append("Emissions exceed revenue — net real yield is negative.")

    # TVL
    if tvl_change_pct < -5:
        msgs.append(f"TVL dropped {abs(tvl_change_pct):.1f}% this week — capital outflows detected.")
    elif tvl_change_pct > 10:
        msgs.append(f"TVL grew {tvl_change_pct:.1f}% this week — protocol attracting capital.")

    # Trend combination
    if rev_trend == "improving" and tvl_trend == "improving":
        msgs.append("Both revenue and TVL trends are improving — sustainability outlook positive.")
    elif rev_trend == "declining" and tvl_trend == "declining":
        msgs.append("Dual decline in revenue and TVL — elevated risk of continued deterioration.")

    return msgs[:5]  # cap at 5 insights


# ── Risk alert generation ─────────────────────────────────────────────────────

@dataclass
class RiskAlert:
    protocol_id: str
    protocol_name: str
    alert_type: str
    severity: str        # critical | warning | info
    message: str
    metric_value: float
    metric_threshold: float


def generate_risk_alerts(
    protocol_id: str,
    protocol_name: str,
    result: SustainabilityResult,
    previous_score: float | None,
    settings_thresholds: dict,
) -> list[RiskAlert]:
    alerts: list[RiskAlert] = []
    ed = result.emissions_dependency_ratio
    em_threshold = settings_thresholds.get("emissions_ratio", 1.0)
    score_drop_threshold = settings_thresholds.get("score_drop", 10.0)

    # 1. Emissions exceed revenue
    if ed >= em_threshold * 1.5:
        alerts.append(RiskAlert(
            protocol_id=protocol_id, protocol_name=protocol_name,
            alert_type="emissions_critical",
            severity="critical",
            message=f"🚨 {protocol_name}: Emissions are {ed:.1f}× revenue. Protocol deeply subsidised — sustainability at risk.",
            metric_value=ed, metric_threshold=em_threshold * 1.5,
        ))
    elif ed >= em_threshold:
        alerts.append(RiskAlert(
            protocol_id=protocol_id, protocol_name=protocol_name,
            alert_type="emissions_exceeded",
            severity="warning",
            message=f"⚠️ {protocol_name}: Emissions exceeded revenue (ratio {ed:.2f}). Real yield is negative.",
            metric_value=ed, metric_threshold=em_threshold,
        ))

    # 2. Score drop
    if previous_score is not None:
        drop = previous_score - result.score
        if drop >= score_drop_threshold * 1.5:
            alerts.append(RiskAlert(
                protocol_id=protocol_id, protocol_name=protocol_name,
                alert_type="score_drop_critical",
                severity="critical",
                message=f"🚨 {protocol_name}: Sustainability score dropped {drop:.0f} pts to {result.score:.0f} — significant deterioration.",
                metric_value=drop, metric_threshold=score_drop_threshold * 1.5,
            ))
        elif drop >= score_drop_threshold:
            alerts.append(RiskAlert(
                protocol_id=protocol_id, protocol_name=protocol_name,
                alert_type="score_drop",
                severity="warning",
                message=f"⚠️ {protocol_name}: Score fell {drop:.0f} pts to {result.score:.0f}. Monitor sustainability trend.",
                metric_value=drop, metric_threshold=score_drop_threshold,
            ))

    # 3. High risk classification
    if result.status == "high_risk":
        alerts.append(RiskAlert(
            protocol_id=protocol_id, protocol_name=protocol_name,
            alert_type="high_risk_status",
            severity="critical",
            message=f"🚨 {protocol_name}: Sustainability score {result.score:.0f} — classified HIGH RISK. Revenue cannot support current emissions.",
            metric_value=result.score, metric_threshold=40.0,
        ))

    # 4. Positive signal — improving
    if result.revenue_trend == "improving" and result.emissions_dependency_ratio < 0.5 and result.score >= 75:
        alerts.append(RiskAlert(
            protocol_id=protocol_id, protocol_name=protocol_name,
            alert_type="improving",
            severity="info",
            message=f"✅ {protocol_name}: Strong sustainability — score {result.score:.0f}, revenue growing, emissions dependency {ed:.0%}.",
            metric_value=result.score, metric_threshold=75.0,
        ))

    return alerts
