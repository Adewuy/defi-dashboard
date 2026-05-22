"""
app/services/defillama.py — DeFiLlama API client.

Endpoints used:
  /overview/fees                       — all protocol fee/revenue overviews
  /summary/fees/{protocol}             — per-protocol detail with daily chart
  /tvl/{protocol}                      — historical TVL
  /protocol/{protocol}                 — full protocol metadata
"""
import asyncio
from typing import Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

BASE = settings.defillama_base_url


class DeFiLlamaService:
    def __init__(self):
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=BASE,
                timeout=30.0,
                headers={"User-Agent": "DeFiSustainabilityDashboard/1.0"},
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ── Low-level helpers ────────────────────────────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _get(self, url: str, params: dict | None = None) -> Any:
        try:
            resp = await self.client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning("defillama_http_error", url=url, status=e.response.status_code)
            raise
        except httpx.RequestError as e:
            logger.warning("defillama_request_error", url=url, error=str(e))
            raise

    # ── Public methods ───────────────────────────────────────────────────────

    async def get_fees_overview(self) -> list[dict]:
        """All protocols with latest fee/revenue data."""
        data = await self._get("/overview/fees", params={
            "excludeTotalDataChart": "true",
            "excludeTotalDataChartBreakdown": "true",
        })
        return data.get("protocols", [])

    async def get_revenue_overview(self) -> list[dict]:
        """All protocols with latest revenue (fees minus LP share)."""
        data = await self._get("/overview/fees", params={
            "excludeTotalDataChart": "true",
            "excludeTotalDataChartBreakdown": "true",
            "dataType": "dailyRevenue",
        })
        return data.get("protocols", [])

    async def get_protocol_fees(self, slug: str) -> dict:
        """Per-protocol fee detail including daily chart."""
        return await self._get(f"/summary/fees/{slug}")

    async def get_protocol_revenue(self, slug: str) -> dict:
        """Per-protocol revenue chart."""
        return await self._get(f"/summary/fees/{slug}", params={"dataType": "dailyRevenue"})

    async def get_protocol_tvl_history(self, slug: str) -> list[dict]:
        """Historical TVL [{date, totalLiquidityUSD}]."""
        data = await self._get(f"/tvl/{slug}")
        # Returns a list of {date: unix_timestamp, totalLiquidityUSD: float}
        return data if isinstance(data, list) else []

    async def get_protocol_meta(self, slug: str) -> dict:
        """Full protocol metadata."""
        return await self._get(f"/protocol/{slug}")

    async def get_current_tvl(self, slug: str) -> float:
        """Latest TVL scalar."""
        try:
            data = await self._get(f"/tvl/{slug}")
            if isinstance(data, (int, float)):
                return float(data)
            if isinstance(data, list) and data:
                return float(data[-1].get("totalLiquidityUSD", 0))
        except Exception:
            pass
        return 0.0

    async def fetch_protocol_full(self, slug: str) -> dict:
        """Fetch fees, revenue, and TVL concurrently for one protocol."""
        fees_task = asyncio.create_task(self.get_protocol_fees(slug))
        rev_task = asyncio.create_task(self.get_protocol_revenue(slug))
        tvl_task = asyncio.create_task(self.get_protocol_tvl_history(slug))

        fees, revenue, tvl = await asyncio.gather(fees_task, rev_task, tvl_task, return_exceptions=True)

        return {
            "slug": slug,
            "fees": fees if not isinstance(fees, Exception) else {},
            "revenue": revenue if not isinstance(revenue, Exception) else {},
            "tvl": tvl if not isinstance(tvl, Exception) else [],
        }

    def extract_daily_chart(self, protocol_data: dict, key: str = "totalDataChart") -> list[dict]:
        """
        Extract daily [{timestamp, value}] from DeFiLlama chart arrays.
        DeFiLlama returns [[unix_ts, value], ...].
        """
        raw = protocol_data.get(key, [])
        result = []
        for entry in raw:
            if isinstance(entry, (list, tuple)) and len(entry) >= 2:
                result.append({"timestamp": int(entry[0]), "value": float(entry[1])})
        return result

    def get_last_n_days(self, chart: list[dict], n: int = 30) -> list[float]:
        """Return last N daily values from a chart list."""
        values = [e["value"] for e in sorted(chart, key=lambda x: x["timestamp"])]
        return values[-n:] if len(values) >= n else values


defillama_service = DeFiLlamaService()
