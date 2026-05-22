"""
app/api/alerts.py — Alert management endpoints.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.alert import Alert
from app.api.schemas import AlertListResponse, AlertResponse, TelegramTestRequest
from app.services.telegram import telegram_service

router = APIRouter(prefix="/api/alerts", tags=["alerts"])
settings = get_settings()


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    severity: str | None = Query(None, description="Filter: critical | warning | info"),
    protocol_id: str | None = Query(None),
    limit: int = Query(50, le=200),
    unacknowledged_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Alert).order_by(desc(Alert.created_at)).limit(limit)

    if severity:
        stmt = stmt.where(Alert.severity == severity)
    if protocol_id:
        stmt = stmt.where(Alert.protocol_id == protocol_id)
    if unacknowledged_only:
        stmt = stmt.where(Alert.acknowledged == False)  # noqa: E712

    result = await db.execute(stmt)
    alerts = result.scalars().all()

    critical = sum(1 for a in alerts if a.severity == "critical")
    warnings = sum(1 for a in alerts if a.severity == "warning")

    return AlertListResponse(
        alerts=alerts,
        total=len(alerts),
        critical_count=critical,
        warning_count=warnings,
    )


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    await db.commit()
    return {"status": "acknowledged", "id": alert_id}


@router.post("/test")
async def send_test_alert(payload: TelegramTestRequest):
    """Send a test Telegram alert to verify bot configuration."""
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=400, detail="Telegram bot not configured. Set TELEGRAM_BOT_TOKEN in .env")
    success = await telegram_service.send_message(payload.message)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send Telegram message. Check bot token and chat ID.")
    return {"status": "sent", "message": payload.message}


@router.delete("/clear")
async def clear_old_alerts(
    days_old: int = Query(30, description="Delete alerts older than N days"),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone, timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_old)
    stmt = select(Alert).where(Alert.created_at < cutoff)
    result = await db.execute(stmt)
    old_alerts = result.scalars().all()
    for a in old_alerts:
        await db.delete(a)
    await db.commit()
    return {"deleted": len(old_alerts)}
