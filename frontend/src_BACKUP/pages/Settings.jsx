// src/pages/Settings.jsx
import { Card, SectionTitle, StatCard } from '../components/ui'
import { useHealth } from '../hooks/useData'
import { fmtDate } from '../utils/format'

export default function Settings() {
  const { data: health } = useHealth()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Settings</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          System status, data sources, and configuration
        </p>
      </div>

      {/* System status */}
      <Card>
        <SectionTitle>System Status</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <StatCard icon="🟢" label="API Status" value={health?.status === 'ok' ? 'Online' : 'Offline'} color={health?.status === 'ok' ? 'var(--success)' : 'var(--danger)'} />
          <StatCard icon="📡" label="DeFiLlama" value="Active" color="var(--success)" />
          <StatCard icon="💰" label="CoinGecko" value="Active" color="var(--success)" />
          <StatCard icon="🤖" label="Telegram Bot" value={health?.telegram_configured ? 'Configured' : 'Not Set'} color={health?.telegram_configured ? 'var(--success)' : 'var(--warning)'} />
          <StatCard icon="📊" label="Dune Analytics" value={health?.dune_configured ? 'Configured' : 'Optional'} color={health?.dune_configured ? 'var(--success)' : 'var(--text-muted)'} />
        </div>
        {health?.last_pipeline_run && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            Last data refresh: {fmtDate(health.last_pipeline_run)}
          </div>
        )}
      </Card>

      {/* Configuration guide */}
      <Card>
        <SectionTitle sub="required environment variables">Backend Configuration</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'COINGECKO_API_KEY', req: false, desc: 'Pro key removes rate limits. Free tier works for development.' },
            { key: 'TELEGRAM_BOT_TOKEN', req: false, desc: 'Get from @BotFather on Telegram. Required for alert notifications.' },
            { key: 'TELEGRAM_CHAT_ID', req: false, desc: 'Your Telegram chat or channel ID. Use @userinfobot to find yours.' },
            { key: 'DUNE_API_KEY', req: false, desc: 'Optional. Enables on-chain emissions data from Dune Analytics queries.' },
            { key: 'ALCHEMY_API_KEY', req: false, desc: 'Optional. For future on-chain RPC data integrations.' },
            { key: 'DATA_REFRESH_INTERVAL_MINUTES', req: false, desc: 'How often to refresh data. Default: 15 minutes.' },
            { key: 'ALERT_EMISSIONS_RATIO_THRESHOLD', req: false, desc: 'Alert when emissions/revenue > this value. Default: 1.0' },
          ].map(({ key, req, desc }) => (
            <div key={key} style={{ padding: '10px 12px', background: 'var(--table-header)', borderRadius: 8, border: '1px solid var(--border-faint)', fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <code style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{key}</code>
                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 10, background: req ? 'rgba(224,82,82,0.12)' : 'rgba(55,138,221,0.12)', color: req ? 'var(--danger)' : 'var(--accent)' }}>
                  {req ? 'required' : 'optional'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'sans-serif' }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(55,138,221,0.06)', borderRadius: 8, border: '1px solid rgba(55,138,221,0.2)', fontSize: 13, color: 'var(--text-muted)' }}>
          Copy <code style={{ color: 'var(--accent)' }}>backend/.env.example</code> to <code style={{ color: 'var(--accent)' }}>backend/.env</code> and fill in your values.
        </div>
      </Card>

      {/* Scoring methodology */}
      <Card>
        <SectionTitle sub="how the 0–100 score is calculated">Scoring Methodology</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Real Yield', '30%', 'Revenue − emissions. Positive yield = protocol covers own incentives.'],
            ['Emissions Dependency', '25%', 'Emissions ÷ revenue. Lower = more organic growth.'],
            ['Revenue Trend', '20%', '7-day revenue direction from linear regression slope.'],
            ['TVL Trend', '15%', 'Total Value Locked change over 7 days.'],
            ['User Activity', '10%', 'Week-over-week active user count change.'],
          ].map(([name, weight, desc]) => (
            <div key={name} style={{ display: 'grid', gridTemplateColumns: '160px 60px 1fr', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-faint)', alignItems: 'start', fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{weight}</span>
              <span style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            ['80–100', 'Healthy', 'var(--success)'],
            ['60–79', 'Stable', '#378ADD'],
            ['40–59', 'Warning', 'var(--warning)'],
            ['0–39', 'High Risk', 'var(--danger)'],
          ].map(([range, label, color]) => (
            <div key={label} style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: `${color}12`, border: `1px solid ${color}30` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{range}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
