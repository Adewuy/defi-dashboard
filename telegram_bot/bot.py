"""
telegram_bot/bot.py — Standalone Telegram bot for DeFi sustainability alerts.

Commands:
    /start          — Welcome message
    /status         — Ecosystem health summary
    /protocol <id>  — Protocol detail
    /alerts         — Recent risk alerts
    /top            — Top 5 sustainable protocols
    /risky          — Protocols with score < 40
    /protocols      — List all tracked protocols
    /subscribe      — Enable this chat for auto alerts
    /help           — Command list

Run: python bot.py
Requires: TELEGRAM_BOT_TOKEN and BACKEND_URL in environment / .env
"""
import asyncio
import os
import httpx
from datetime import datetime
from dotenv import load_dotenv
from telegram import Update, BotCommand
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is not set. Check your .env file.")


# ── API helpers ──────────────────────────────────────────────────────────────

async def _api_get(path: str) -> dict | list | None:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{BACKEND_URL}{path}")
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        return None


def _fmt_usd(value: float) -> str:
    if abs(value) >= 1e9:
        return f"${value/1e9:.2f}B"
    if abs(value) >= 1e6:
        return f"${value/1e6:.2f}M"
    if abs(value) >= 1e3:
        return f"${value/1e3:.0f}K"
    return f"${value:.0f}"


def _score_emoji(score: float) -> str:
    if score >= 80:
        return "🟢"
    if score >= 60:
        return "🔵"
    if score >= 40:
        return "🟡"
    return "🔴"


def _severity_emoji(severity: str) -> str:
    return {"critical": "🚨", "warning": "⚠️", "info": "ℹ️"}.get(severity, "📊")


# ── Command handlers ─────────────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    text = (
        "🚀 <b>DeFi Sustainability Dashboard Bot</b>\n\n"
        "I track whether DeFi protocols are truly profitable or surviving on token emissions.\n\n"
        "Use /help to see available commands."
    )
    await update.message.reply_html(text)


async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    text = (
        "📋 <b>Available Commands</b>\n\n"
        "/status — Ecosystem health overview\n"
        "/top — Top 5 sustainable protocols\n"
        "/risky — High-risk protocols\n"
        "/protocol &lt;id&gt; — Protocol detail (e.g. /protocol aave)\n"
        "/alerts — Latest risk alerts\n"
        "/protocols — All tracked protocols\n"
        "/compare &lt;a,b,c&gt; — Compare protocols\n"
        "/help — This message\n\n"
        "<i>Data refreshes every 15 minutes from DeFiLlama + CoinGecko.</i>"
    )
    await update.message.reply_html(text)


async def cmd_status(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    data = await _api_get("/api/analytics/ecosystem/summary")
    if not data:
        await update.message.reply_text("⚠️ Could not fetch ecosystem data. Backend may be starting up.")
        return

    by_status = data.get("protocols_by_status", {})
    text = (
        f"🌍 Could not fetch rankings."
    )

    rankings = data.get("rankings", [])[:5]
    lines = ["📊 <b>Top 5 Sustainable Protocols</b>\n"]
    for r in rankings:
        p = r["protocol"]
        em = _score_emoji(p["sustainability_score"])
        ry = p.get("real_yield_daily", 0)
        ry_str = f"+{_fmt_usd(ry)}" if ry >= 0 else f"-{_fmt_usd(abs(ry))}"
        lines.append(
            f"{r['rank']}. {em} <b>{p['name']}</b>\n"
            f"   Score: {p['sustainability_score']:.0f}  |  Real Yield: {ry_str}/day\n"
            f"   Emissions ratio: {p['emissions_dependency_ratio']:.2f}"
        )
    await update.message.reply_html("\n\n".join(lines))


async def cmd_risky(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    data = await _api_get("/api/protocols?sort_by=sustainability_score&order=asc&limit=5")
    if not data:
        await update.message.reply_text("⚠️ Could not fetch protocol data.")
        return

    protocols = [p for p in data.get("protocols", []) if p["sustainability_score"] < 40]
    if not protocols:
        await update.message.reply_html("✅ <b>No high-risk protocols detected right now.</b>")
        return

    lines = ["🔴 <b>High-Risk Protocols</b>\n"]
    for p in protocols[:5]:
        ed = p.get("emissions_dependency_ratio", 0)
        ry = p.get("real_yield_daily", 0)
        lines.append(
            f"🚨 <b>{p['name']}</b>  Score: {p['sustainability_score']:.0f}\n"
            f"   Em. Ratio: {ed:.2f}x  |  Real Yield: {_fmt_usd(ry)}/day\n"
            f"   TVL: {_fmt_usd(p.get('tvl', 0))}"
        )
    await update.message.reply_html("\n\n".join(lines))


async def cmd_protocol(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    args = ctx.args
    if not args:
        await update.message.reply_text("Usage: /protocol <id>\nExample: /protocol aave")
        return

    slug = args[0].lower().strip()
    data = await _api_get(f"/api/protocols/{slug}")
    if not data:
        await update.message.reply_text(f"⚠️ Could not fetch data for '{slug}'. Check the protocol ID.")
        return

    em = _score_emoji(data.get("sustainability_score", 0))
    ry = data.get("real_yield_daily", 0)
    ry_str = f"+{_fmt_usd(ry)}" if ry >= 0 else f"-{_fmt_usd(abs(ry))}"
    status_map = {
        "profitable": "✅ Profitable",
        "break-even": "⚖️ Break-even",
        "unknown": "❓ Unknown",
    }
    text = (
        f"{em} <b>{data.get('name')}</b>  —  {data.get('category', '')}\n\n"
        f"Score: <b>{data.get('sustainability_score', 0):.0f}</b>\n"
        f"Status: {status_map.get(data.get('profitability_status', 'unknown'), '❓ Could not fetch alerts.')}\n"
        f"TVL: <b>{_fmt_usd(data.get('tvl', 0))}</b>\n"
        f"Revenue/day: {_fmt_usd(data.get('daily_revenue', 0))}\n"
        f"Emissions/day: {_fmt_usd(data.get('daily_emissions_usd', 0))}\n"
        f"Real Yield: <b>{ry_str}/day</b>\n"
        f"Emissions Ratio: {data.get('emissions_dependency_ratio', 0):.2f}x"
    )
    await update.message.reply_html(text)


async def cmd_alerts(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    data = await _api_get("/api/alerts?limit=6")
    if not data:
        await update.message.reply_text("⚠️ Could not fetch alerts.")
        return

    alert_list = data.get("alerts", [])
    if not alert_list:
        await update.message.reply_html("✅ <b>No recent alerts.</b> All protocols look stable.")
        return

    lines = [f"🔔 <b>Recent Alerts</b>  ({data.get('critical_count', 0)} critical, {data.get('warning_count', 0)} warnings)\n"]
    for a in alert_list[:6]:
        em = _severity_emoji(a["severity"])
        ts = a.get("created_at", "")[:16].replace("T", " ")
        lines.append(f"{em} <b>{a['protocol_name']}</b>  <i>{ts}</i>\n{a['message']}")

    await update.message.reply_html("\n\n".join(lines))


async def cmd_compare(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    args = ctx.args
    if not args:
        await update.message.reply_text("Usage: /compare aave,gmx,lido")
        return

    ids = args[0] if args else ""
    data = await _api_get(f"/api/analytics/compare?ids={ids}")
    if not data:
        await update.message.reply_text("⚠️ Could not fetch comparison data.")
        return

    protocols = data.get("protocols", [])
    lines = ["📊 <b>Protocol Comparison</b>\n"]
    for p in protocols:
        em = _score_emoji(p["sustainability_score"])
        ry = p.get("real_yield_daily", 0)
        ry_str = f"+{_fmt_usd(ry)}" if ry >= 0 else f"-{_fmt_usd(abs(ry))}"
        lines.append(
            f"{em} <b>{p['name']}</b>  Score: {p['sustainability_score']:.0f}\n"
            f"   Revenue: {_fmt_usd(p.get('daily_revenue', 0))}/day  "
            f"Emissions: {_fmt_usd(p.get('daily_emissions_usd', 0))}/day\n"
            f"   Real Yield: {ry_str}  |  TVL: {_fmt_usd(p.get('tvl', 0))}"
        )
    await update.message.reply_html("\n\n".join(lines))


async def cmd_protocols(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """List all tracked protocols with scores."""
    data = await _api_get("/api/protocols?limit=100")
    if not data:
        await update.message.reply_text("⚠️ Could not fetch protocol list.")
        return

    protocols = data.get("protocols", [])
    if not protocols:
        await update.message.reply_html("⚠️ <b>No protocols found.</b>")
        return

    lines = [f"📋 <b>All Tracked Protocols ({len(protocols)})</b>\n"]
    for i, p in enumerate(sorted(protocols, key=lambda x: x.get("sustainability_score", 0), reverse=True), 1):
        em = _score_emoji(p.get("sustainability_score", 0))
        name = p.get("name", "?")
        score = p.get("sustainability_score", 0)
        category = p.get("category", "")
        lines.append(f"{i}. {em} <b>{name}</b>  <i>{category}</i>  Score: {score:.0f}")

    lines.append(f"\n<i>Data refreshes every 15 minutes from DeFiLlama + CoinGecko.</i>")
    await update.message.reply_html("\n".join(lines))


async def fallback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Unknown command. Use /help to see available commands.")


# ── App setup ────────────────────────────────────────────────────────────────

async def post_init(app: Application) -> None:
    await app.bot.set_my_commands([
        BotCommand("start", "Welcome message"),
        BotCommand("status", "Ecosystem health overview"),
        BotCommand("top", "Top 5 sustainable protocols"),
        BotCommand("risky", "High-risk protocols"),
        BotCommand("protocol", "Protocol detail (e.g. /protocol aave)"),
        BotCommand("alerts", "Latest risk alerts"),
        BotCommand("protocols", "All tracked protocols"),
        BotCommand("compare", "Compare protocols (e.g. /compare aave,gmx,lido)"),
        BotCommand("help", "This help message"),
    ])


def main():
    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(post_init)
        .build()
    )

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("top", cmd_status))
    app.add_handler(CommandHandler("risky", cmd_risky))
    app.add_handler(CommandHandler("protocol", cmd_protocol))
    app.add_handler(CommandHandler("alerts", cmd_alerts))
    app.add_handler(CommandHandler("compare", cmd_compare))
    app.add_handler(CommandHandler("protocols", cmd_protocols))
    app.add_handler(MessageHandler(filters.COMMAND, fallback))

    print("Bot is running... Press Ctrl+C to stop.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()