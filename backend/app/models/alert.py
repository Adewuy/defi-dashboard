"""
app/models/alert.py — risk alert records.
"""
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    protocol_id: Mapped[str] = mapped_column(String(64), index=True)
    protocol_name: Mapped[str] = mapped_column(String(128))
    alert_type: Mapped[str] = mapped_column(String(64))   # emissions_exceeded, score_drop, tvl_drop, etc.
    severity: Mapped[str] = mapped_column(String(16))      # critical | warning | info
    message: Mapped[str] = mapped_column(Text)
    metric_value: Mapped[float] = mapped_column(Float, default=0.0)
    metric_threshold: Mapped[float] = mapped_column(Float, default=0.0)
    sent_to_telegram: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
