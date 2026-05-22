"""
app/core/config.py — centralised settings via pydantic-settings.
All values are read from environment variables (or .env file).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ──────────────────────────────────────────────
    app_name: str = "DeFi Sustainability Dashboard"
    environment: str = "development"
    secret_key: str = "changeme"
    debug: bool = False

    # ── Database ─────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./defi_analytics.db"

    # ── Redis ────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379"
    cache_ttl_seconds: int = 300          # 5 min default cache

    # ── External APIs ────────────────────────────────────
    coingecko_api_key: str = ""           # empty = free tier (rate-limited)
    dune_api_key: str = ""
    the_graph_api_key: str = ""
    alchemy_api_key: str = ""

    # ── Telegram ─────────────────────────────────────────
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # ── Scheduler ────────────────────────────────────────
    data_refresh_interval_minutes: int = 15

    # ── Alert thresholds ─────────────────────────────────
    alert_emissions_ratio_threshold: float = 1.0   # emissions/revenue
    alert_score_drop_threshold: float = 10.0        # points in 24 h
    alert_tvl_drop_pct: float = 5.0                 # % decline in 7 d

    # ── DeFiLlama ────────────────────────────────────────
    defillama_base_url: str = "https://api.llama.fi"
    defillama_fees_url: str = "https://api.llama.fi/overview/fees"
    defillama_revenue_url: str = "https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue"

    # ── Tracked protocols (DeFiLlama slug: display name) ─
    tracked_protocols: dict[str, str] = {
        "aave":      "Aave",
        "uniswap":   "Uniswap",
        "gmx":       "GMX",
        "curve":     "Curve Finance",
        "compound":  "Compound",
        "lido":      "Lido",
        "synthetix": "Synthetix",
        "frax":      "Frax",
        "maker":     "MakerDAO",
        "convex":    "Convex Finance",
    }

    # ── CoinGecko token IDs for emission price lookup ────
    protocol_token_ids: dict[str, str] = {
        "aave":      "aave",
        "uniswap":   "uniswap",
        "gmx":       "gmx",
        "curve":     "curve-dao-token",
        "compound":  "compound-governance-token",
        "lido":      "lido-dao",
        "synthetix": "havven",
        "frax":      "frax-share",
        "maker":     "maker",
        "convex":    "convex-finance",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
frontend_url: str = "http://localhost:5173"