"""
app/services/dune.py — Optional Dune Analytics client for on-chain emissions data.

Dune queries return deeper on-chain emissions metrics not available from DeFiLlama.
If DUNE_API_KEY is not set, methods return empty/fallback values gracefully.

Useful public queries (examples — swap for your own):
  - Aave emissions: https://dune.com/queries/1234567
  - Uniswap LP incentives: https://dune.com/queries/7654321
"""
import asyncio
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

DUNE_API_BASE = "https://api.dune.com/api/v1"

# Map protocol slug → Dune query ID for emissions data.
# Replace with your own query IDs from https://dune.com
PROTOCOL_DUNE_QUERIES: dict[str, int] = {
    # "aave": 1234567,
    # "uniswap": 7654321,
    # "gmx": 9988776,
}


class DuneService:
    def __init__(self):
        self._enabled = bool(settings.dune_api_key)
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=DUNE_API_BASE,
                timeout=60.0,
                headers={"X-Dune-API-Key": settings.dune_api_key},
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=2, min=5, max=30))
    async def _execute_query(self, query_id: int, params: dict | None = None) -> list[dict]:
        """Execute a Dune query and poll for results."""
        if not self._enabled:
            return []

        # Trigger execution
        exec_resp = await self.client.post(
            f"/query/{query_id}/execute",
            json={"query_parameters": params or {}},
        )
        exec_resp.raise_for_status()
        execution_id = exec_resp.json()["execution_id"]

        # Poll until complete (max 60s)
        for _ in range(12):
            await asyncio.sleep(5)
            status_resp = await self.client.get(f"/execution/{execution_id}/status")
            status = status_resp.json().get("state", "")
            if status == "QUERY_STATE_COMPLETED":
                results_resp = await self.client.get(f"/execution/{execution_id}/results")
                return results_resp.json().get("result", {}).get("rows", [])
            if status in ("QUERY_STATE_FAILED", "QUERY_STATE_CANCELLED"):
                logger.warning("dune_query_failed", query_id=query_id, state=status)
                return []

        logger.warning("dune_query_timeout", query_id=query_id)
        return []

    async def get_protocol_emissions(self, protocol_slug: str) -> dict:
        """
        Return daily emissions USD estimate from a Dune query.
        Falls back to empty dict if no query configured or API key missing.
        """
        if not self._enabled:
            return {}

        query_id = PROTOCOL_DUNE_QUERIES.get(protocol_slug)
        if not query_id:
            return {}

        try:
            rows = await self._execute_query(query_id)
            if not rows:
                return {}
            # Expected columns: day, daily_emissions_usd, token_amount
            latest = rows[-1] if rows else {}
            return {
                "daily_emissions_usd": float(latest.get("daily_emissions_usd", 0)),
                "token_amount": float(latest.get("token_amount", 0)),
                "source": "dune",
            }
        except Exception as e:
            logger.warning("dune_emissions_error", protocol=protocol_slug, error=str(e))
            return {}

    @property
    def is_enabled(self) -> bool:
        return self._enabled


dune_service = DuneService()
