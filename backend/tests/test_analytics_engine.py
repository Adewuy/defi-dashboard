"""
tests/test_analytics_engine.py — Unit tests for the analytics engine.
Run: pytest tests/ -v
"""
import pytest
from app.analytics.engine import (
    calculate_real_yield,
    calculate_emissions_dependency_ratio,
    pct_change,
    trend_direction,
    compute_sustainability_score,
    classify_score,
    classify_profitability,
    generate_risk_alerts,
    SustainabilityInputs,
)


# ── Real yield ────────────────────────────────────────────────────────────────

def test_real_yield_positive():
    assert calculate_real_yield(2_000_000, 1_000_000) == 1_000_000


def test_real_yield_negative():
    assert calculate_real_yield(500_000, 1_200_000) == -700_000


def test_real_yield_zero_emissions():
    assert calculate_real_yield(1_000_000, 0) == 1_000_000


# ── Emissions dependency ──────────────────────────────────────────────────────

def test_emissions_dep_below_one():
    ratio = calculate_emissions_dependency_ratio(500_000, 2_000_000)
    assert ratio == 0.25


def test_emissions_dep_above_one():
    ratio = calculate_emissions_dependency_ratio(1_500_000, 800_000)
    assert ratio > 1.0


def test_emissions_dep_zero_revenue():
    ratio = calculate_emissions_dependency_ratio(1_000, 0)
    assert ratio == float("inf")


# ── Pct change ────────────────────────────────────────────────────────────────

def test_pct_change_positive():
    assert pct_change(110, 100) == 10.0


def test_pct_change_negative():
    assert pct_change(80, 100) == -20.0


def test_pct_change_zero_previous():
    assert pct_change(100, 0) == 0.0


# ── Trend direction ───────────────────────────────────────────────────────────

def test_trend_improving():
    values = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2]
    assert trend_direction(values) == "improving"


def test_trend_declining():
    values = [2.2, 2.0, 1.8, 1.6, 1.4, 1.2, 1.0]
    assert trend_direction(values) == "declining"


def test_trend_stable():
    values = [1.0, 1.01, 0.99, 1.0, 1.01, 0.99, 1.0]
    assert trend_direction(values) == "stable"


def test_trend_too_short():
    assert trend_direction([1.0]) == "stable"


# ── Score classification ──────────────────────────────────────────────────────

def test_classify_healthy():
    assert classify_score(85) == "healthy"


def test_classify_stable():
    assert classify_score(65) == "stable"


def test_classify_warning():
    assert classify_score(50) == "warning"


def test_classify_high_risk():
    assert classify_score(30) == "high_risk"


# ── Profitability ─────────────────────────────────────────────────────────────

def test_profitable():
    assert classify_profitability(2_000_000, 500_000) == "profitable"


def test_unprofitable():
    assert classify_profitability(500_000, 2_000_000) == "unprofitable"


def test_break_even():
    assert classify_profitability(1_000_000, 1_020_000) == "break_even"


# ── Full score computation ────────────────────────────────────────────────────

def _make_inputs(**kwargs) -> SustainabilityInputs:
    defaults = dict(
        daily_revenue=2_000_000,
        daily_emissions=800_000,
        tvl_current=8_000_000_000,
        tvl_7d_ago=7_500_000_000,
        revenue_history=[1_600_000, 1_700_000, 1_800_000, 1_850_000, 1_900_000, 1_950_000, 2_000_000],
        emissions_history=[900_000] * 7,
        tvl_history=[7_500_000_000] * 7 + [8_000_000_000],
    )
    defaults.update(kwargs)
    return SustainabilityInputs(**defaults)


def test_high_sustainability_score():
    inputs = _make_inputs()
    result = compute_sustainability_score(inputs)
    assert result.score >= 70
    assert result.real_yield > 0
    assert result.status in ("healthy", "stable")


def test_low_sustainability_score():
    inputs = _make_inputs(
        daily_revenue=500_000,
        daily_emissions=2_000_000,
        tvl_current=400_000_000,
        tvl_7d_ago=700_000_000,
        revenue_history=[900_000, 800_000, 750_000, 700_000, 650_000, 600_000, 500_000],
    )
    result = compute_sustainability_score(inputs)
    assert result.score < 50
    assert result.real_yield < 0
    assert result.status in ("warning", "high_risk")


def test_insights_generated():
    inputs = _make_inputs()
    result = compute_sustainability_score(inputs)
    assert len(result.insights) > 0
    assert all(isinstance(i, str) for i in result.insights)


def test_score_bounded():
    # Edge case: zero revenue
    inputs = _make_inputs(daily_revenue=0, daily_emissions=0)
    result = compute_sustainability_score(inputs)
    assert 0 <= result.score <= 100


# ── Risk alerts ───────────────────────────────────────────────────────────────

def test_alert_emissions_exceeded():
    from app.analytics.engine import SustainabilityResult
    result = SustainabilityResult(
        score=35, status="high_risk", profitability="unprofitable",
        real_yield=-700_000, emissions_dependency_ratio=1.8,
        revenue_trend="declining", tvl_trend="declining",
        component_scores={}, insights=[],
    )
    alerts = generate_risk_alerts("curve", "Curve", result, 55.0, {"emissions_ratio": 1.0, "score_drop": 10.0})
    alert_types = [a.alert_type for a in alerts]
    assert any("emissions" in t for t in alert_types)
    assert any("score_drop" in t or "high_risk" in t for t in alert_types)


def test_alert_improving_protocol():
    from app.analytics.engine import SustainabilityResult
    result = SustainabilityResult(
        score=82, status="healthy", profitability="profitable",
        real_yield=1_200_000, emissions_dependency_ratio=0.25,
        revenue_trend="improving", tvl_trend="improving",
        component_scores={}, insights=[],
    )
    alerts = generate_risk_alerts("lido", "Lido", result, 78.0, {"emissions_ratio": 1.0, "score_drop": 10.0})
    assert any(a.alert_type == "improving" for a in alerts)
