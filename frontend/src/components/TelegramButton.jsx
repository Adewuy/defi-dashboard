/**
 * TelegramButton.jsx
 * Drop this into: frontend/src/components/TelegramButton.jsx
 * Then import and add <TelegramButton /> anywhere in your app.
 *
 * Replace YOUR_BOT_USERNAME with your actual bot username (without @)
 */

import { useState, useEffect } from "react";

const BOT_USERNAME = "Deebrainz_bot";

const COMMANDS = [
  { cmd: "/start",    label: "Start",     desc: "Welcome & overview",          emoji: "👋" },
  { cmd: "/status",   label: "Status",    desc: "Ecosystem health summary",     emoji: "🌍" },
  { cmd: "/top",      label: "Top 5",     desc: "Most sustainable protocols",   emoji: "🏆" },
  { cmd: "/risky",    label: "Risky",     desc: "High-risk protocols",          emoji: "🔴" },
  { cmd: "/alerts",   label: "Alerts",    desc: "Latest risk alerts",           emoji: "🔔" },
  { cmd: "/protocols",label: "All",       desc: "All tracked protocols",        emoji: "📋" },
];

export default function TelegramButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const openBot = (cmd = "") => {
    const url = cmd
      ? `https://t.me/${BOT_USERNAME}?start=${cmd.replace("/", "")}`
      : `https://t.me/${BOT_USERNAME}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyCmd = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopied(cmd);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen(true)}
        style={styles.fab}
        aria-label="Open Telegram Bot"
        title="Get alerts on Telegram"
      >
        <TelegramIcon size={22} />
        <span style={styles.fabLabel}>Alerts</span>
      </button>

      {/* ── Backdrop ── */}
      {open && (
        <div style={styles.backdrop} onClick={() => setOpen(false)} />
      )}

      {/* ── Modal panel ── */}
      {open && (
        <div style={styles.modal}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.iconWrap}>
                <TelegramIcon size={20} color="#fff" />
              </div>
              <div>
                <div style={styles.title}>DeFi Alert Bot</div>
                <div style={styles.subtitle}>Live protocol monitoring on Telegram</div>
              </div>
            </div>
            <button style={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* CTA */}
          <div style={styles.cta}>
            <p style={styles.ctaText}>
              Get real-time alerts when protocols turn risky, scores drop, or emissions exceed revenue — directly in Telegram.
            </p>
            <button style={styles.primaryBtn} onClick={() => openBot()}>
              <TelegramIcon size={16} color="#fff" />
              Open Bot in Telegram
            </button>
          </div>

          {/* Divider */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>Available Commands</span>
          </div>

          {/* Command grid */}
          <div style={styles.grid}>
            {COMMANDS.map(({ cmd, label, desc, emoji }) => (
              <div key={cmd} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.emoji}>{emoji}</span>
                  <span style={styles.cmdLabel}>{label}</span>
                </div>
                <div style={styles.cmdDesc}>{desc}</div>
                <div style={styles.cardActions}>
                  <button
                    style={styles.runBtn}
                    onClick={() => openBot(cmd)}
                  >
                    Run →
                  </button>
                  <button
                    style={{
                      ...styles.copyBtn,
                      ...(copied === cmd ? styles.copiedBtn : {}),
                    }}
                    onClick={() => copyCmd(cmd)}
                  >
                    {copied === cmd ? "✓" : cmd}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <span style={styles.footerDot} />
            Data refreshes every 15 min · DeFiLlama + CoinGecko
          </div>
        </div>
      )}
    </>
  );
}

// ── Telegram SVG icon ──────────────────────────────────────────────────────
function TelegramIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
    </svg>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  fab: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 18px",
    background: "linear-gradient(135deg, #229ED9, #0088cc)",
    color: "#fff",
    border: "none",
    borderRadius: "50px",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(0,136,204,0.45)",
    fontSize: "14px",
    fontWeight: 600,
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  fabLabel: {
    letterSpacing: "0.3px",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 1001,
    backdropFilter: "blur(2px)",
  },
  modal: {
    position: "fixed",
    bottom: "80px",
    right: "24px",
    zIndex: 1002,
    width: "360px",
    maxWidth: "calc(100vw - 32px)",
    background: "#0f1117",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
    animation: "slideUp 0.2s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px",
    background: "linear-gradient(135deg, #0088cc, #005f8e)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconWrap: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontWeight: 700,
    fontSize: "15px",
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "11px",
    marginTop: "1px",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "none",
    color: "#fff",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    padding: "16px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  ctaText: {
    color: "#a0aec0",
    fontSize: "13px",
    lineHeight: "1.5",
    margin: "0 0 12px",
  },
  primaryBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "11px",
    background: "linear-gradient(135deg, #229ED9, #0088cc)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    letterSpacing: "0.2px",
  },
  divider: {
    padding: "12px 18px 8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dividerText: {
    color: "#4a5568",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    padding: "0 18px 16px",
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  emoji: {
    fontSize: "14px",
  },
  cmdLabel: {
    color: "#e2e8f0",
    fontWeight: 600,
    fontSize: "13px",
  },
  cmdDesc: {
    color: "#718096",
    fontSize: "11px",
    lineHeight: "1.3",
    marginBottom: "6px",
  },
  cardActions: {
    display: "flex",
    gap: "6px",
    marginTop: "auto",
  },
  runBtn: {
    flex: 1,
    padding: "5px 0",
    background: "rgba(0,136,204,0.2)",
    color: "#63b3ed",
    border: "1px solid rgba(0,136,204,0.3)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 600,
  },
  copyBtn: {
    padding: "5px 8px",
    background: "rgba(255,255,255,0.05)",
    color: "#718096",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "10px",
    fontFamily: "monospace",
    transition: "all 0.15s",
  },
  copiedBtn: {
    background: "rgba(72,187,120,0.15)",
    color: "#68d391",
    borderColor: "rgba(72,187,120,0.3)",
  },
  footer: {
    padding: "10px 18px",
    background: "rgba(0,0,0,0.3)",
    color: "#4a5568",
    fontSize: "11px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  footerDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#48bb78",
    display: "inline-block",
  },
};
