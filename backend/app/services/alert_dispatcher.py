"""
app/services/alert_dispatcher.py — Sends freshly generated alerts to Telegram
and marks them as sent in the database.

Called at the end of each pipeline run.
"""
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.services.telegram import telegram_service
from app.core.logging import get_logger

logger = get_logger(__name__)


async def dispatch_pending_alerts(db: AsyncSession) -> int:
    """
    Find all unsent alerts (critical or warning), send to Telegram,
    mark as sent. Returns count dispatched.
    """
    stmt = (
        select(Alert)
        .where(Alert.sent_to_telegram == False)      # noqa: E712
        .where(Alert.severity.in_(["critical", "warning"]))
        .order_by(Alert.created_at.asc())
    )
    result = await db.execute(stmt)
    pending = result.scalars().all()

    if not pending:
        return 0

    dispatched = 0
    for alert in pending:
        try:
            success = await telegram_service.send_alert(alert.message, alert.severity)
            if success:
                alert.sent_to_telegram = True
                dispatched += 1
            # Brief delay to stay within Telegram rate limits (30 msg/s)
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.warning("alert_dispatch_error", alert_id=alert.id, error=str(e))

    await db.commit()
    logger.info("alerts_dispatched", count=dispatched, total_pending=len(pending))
    return dispatched


async def send_daily_digest(db: AsyncSession) -> bool:
    """
    Build and send a daily digest of all protocol scores.
    Intended to be called once per day via a separate scheduler job.
    """
    from app.models.protocol import ProtocolSnapshot
    from app.analytics.engine import classify_score

    result = await db.execute(select(ProtocolSnapshot))
    snaps = result.scalars().all()

    if not snaps:
        return False

    protocols = [
        {
            "name": s.name,
            "score": s.sustainability_score,
            "status": classify_score(s.sustainability_score),
            "real_yield": s.real_yield_daily,
        }
        for s in snaps
    ]
    return await telegram_service.send_daily_digest(protocols)
