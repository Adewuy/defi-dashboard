"""
app/services/coingecko.py — CoinGecko price & market data client.

Free tier: ~10–30 req/min. Pro key lifts limits significantly.
"""
import asyncio
from typing import Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

_FREE_BASE = "https://api.coingecko.com/api/v3"
_PRO_BASE = "https://pro-api.coingecko.com/api/v3"


class CoinGeckoService:
    def __init__(self):
        self._client: httpx.AsyncClient | None = None
        self._base = _PRO_BASE if settings.coingecko_api_key else _FREE_BASE

    @property
    def _headers(self) -> dict:
        if settings.coingecko_api_key:
            return {"x-cg-pro-api-key": settings.coingecko_api_key}
        return {}

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._base,
                timeout=20.0,
                headers={"User-Agent": "DeFiSustainabilityDashboard/1.0", **self._headers},
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=3, max=15))
    async def _get(self, path: str, params: dict | None = None) -> Any:
        try:
            resp = await self.client.get(path, params=params)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("coingecko_rate_limited", path=path)
                await asyncio.sleep(60)
            raise

    # ── Price fetching ───────────────────────────────────────────────────────

    async def get_prices(self, token_ids: list[str]) -> dict[str, float]:
        """
        Fetch current USD prices for a list of CoinGecko token IDs.
        Returns {token_id: price_usd}.
        """
        if not token_ids:
            return {}
        ids_str = ",".join(token_ids)
        data = await self._get("/simple/price", params={"ids": ids_str, "vs_currencies": "usd"})
        return {tid: float(data.get(tid, {}).get("usd", 0)) for tid in token_ids}

    async def get_token_market_data(self, token_id: str) -> dict:
        """Full market data for one token."""
        data = await self._get(f"/coins/{token_id}", params={
            "localization": "false",
            "tickers": "false",
            "community_data": "false",
            "developer_data": "false",
        })
        market = data.get("market_data", {})
        return {
            "id": token_id,
            "symbol": data.get("symbol", ""),
            "name": data.get("name", ""),
            "price_usd": float(market.get("current_price", {}).get("usd", 0)),
            "market_cap": float(market.get("market_cap", {}).get("usd", 0)),
            "circulating_supply": float(market.get("circulating_supply") or 0),
            "total_supply": float(market.get("total_supply") or 0),
            "price_change_24h_pct": float(market.get("price_change_percentage_24h") or 0),
            "fdv": float(market.get("fully_diluted_valuation", {}).get("usd", 0)),
        }

    async def get_historical_prices(self, token_id: str, days: int = 30) -> list[dict]:
        """
        Daily price history for emissions cost reconstruction.
        Returns [{timestamp_ms, price_usd}].
        """
        data = await self._get(f"/coins/{token_id}/market_chart", params={
            "vs_currency": "usd",
            "days": str(days),
            "interval": "daily",
        })
        prices = data.get("prices", [])
        return [{"timestamp_ms": int(p[0]), "price_usd": float(p[1])} for p in prices]

    async def get_all_protocol_prices(self) -> dict[str, float]:
        """Batch-fetch prices for all tracked protocol tokens."""
        token_ids = list(settings.protocol_token_ids.values())
        return await self.get_prices(token_ids)


coingecko_service = CoinGeckoService()
