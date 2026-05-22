"""
app/services/telegram.py — Telegram Bot notification service.

Sends risk alerts to a Telegram channel or user.
Uses the python-telegram-bot library (async).
"""
import asyncio
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

TELEGRAM_API = "https://api.telegram.org"


class TelegramService:
    def __init__(self):
        self._enabled = bool(settings.telegram_bot_token and settings.telegram_chat_id)

    @property
    def is_enabled(self) -> bool:
        return self._enabled

    async def send_message(self, text: str, parse_mode: str = "HTML") -> bool:
        """Send a message to the configured chat. Returns True on success."""
        if not self._enabled:
            logger.debug("telegram_not_configured")
            return False

        url = f"{TELEGRAM_API}/bot{settings.telegram_bot_token}/sendMessage"
        payload = {
            "chat_id": settings.telegram_chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    logger.info("telegram_sent", chat_id=settings.telegram_chat_id)
                    return True
                else:
                    logger.warning("telegram_send_failed", status=resp.status_code, body=resp.text[:200])
                    return False
        except Exception as e:
            logger.error("telegram_error", error=str(e))
            return False

    async def send_alert(self, message: str, severity: str = "warning") -> bool:
        """Format and send a risk alert."""
        icons = {"critical": "🚨", "warning": "⚠️", "info": "ℹ️"}
        icon = icons.get(severity, "📊")
        formatted = f"{icon} <b>DeFi Sustainability Alert</b>\n\n{message}"
        return await self.send_message(formatted)

    async def send_daily_digest(self, protocols: list[dict]) -> bool:
        """
        Send a daily summary of all tracked protocols.
        protocols: list of dicts with name, score, status, real_yield
        """
        if not protocols:
            return False

        lines = ["📊 <b>DeFi Sustainability Daily Digest</b>\n"]
        for p in sorted(protocols, key=lambda x: x.get("score", 0), reverse=True):
            score = p.get("score", 0)
            name = p.get("name", "?")
            status = p.get("status", "")
            real_yield = p.get("real_yield", 0)

            emoji = "🟢" if score >= 80 else "🟡" if score >= 60 else "🟠" if score >= 40 else "🔴"
            yield_str = f"+${real_yield:,.0f}" if real_yield >= 0 else f"-${abs(real_yield):,.0f}"
            lines.append(f"{emoji} <b>{name}</b>  Score: {score:.0f}  Yield: {yield_str}/day")

        lines.append("\n<i>DeFi Sustainability Dashboard</i>")
        return await self.send_message("\n".join(lines))


telegram_service = TelegramService()
