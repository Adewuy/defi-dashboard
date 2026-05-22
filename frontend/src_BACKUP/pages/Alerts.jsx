// src/pages/Alerts.jsx
import { useState } from 'react'
import { Card, SectionTitle, Button, StatCard } from '../components/ui'
import AlertsPanel from '../components/AlertsPanel'
import { useAlerts, useSendTestAlert } from '../hooks/useData'

export default function Alerts() {
  const { data } = useAlerts({ limit: 1 })
  const testMutation = useSendTestAlert()
  const [testMsg, setTestMsg] = useState('🧪 Test alert from DeFi Sustainability Dashboard.')
  const [testSent, setTestSent] = useState(false)

  const handleTest = async () => {
    try {
      await testMutation.mutateAsync(testMsg)
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Risk Alerts</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Auto-generated when sustainability conditions deteriorate
        </p>
      </div>

      {/* Alert stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <StatCard icon="🚨" label="Critical" value={data?.critical_count || '—'} color="var(--danger)" />
        <StatCard icon="⚠️" label="Warnings" value={data?.warning_count || '—'} color="var(--warning)" />
        <StatCard icon="📊" label="Total Alerts" value={data?.total || '—'} />
        <StatCard icon="🤖" label="Telegram" value="Active" color="var(--success)" sub="alerts forwarded" />
      </div>

      {/* Alert feed with filters */}
      <Card>
        <SectionTitle sub="sorted by newest">Live Alert Feed</SectionTitle>
        <AlertsPanel maxItems={30} showFilters />
      </Card>

      {/* Telegram test */}
      <Card>
        <SectionTitle sub="verify your Telegram bot is working">Test Telegram Alerts</SectionTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Test message</label>
            <input
              value={testMsg}
              onChange={e => setTestMsg(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testMutation.isPending}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              background: testSent ? 'var(--success)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {testMutation.isPending ? '⏳ Sending…' : testSent ? '✅ Sent!' : '📨 Send Test'}
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          ℹ️ Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to be set in backend/.env
        </div>
      </Card>

      {/* Alert trigger docs */}
      <Card>
        <SectionTitle sub="when alerts fire">Alert Trigger Conditions</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { icon: '🚨', title: 'Emissions Critical', desc: 'Token emissions exceed 1.5× daily revenue' },
            { icon: '⚠️', title: 'Emissions Exceeded', desc: 'Emissions exceed revenue (ratio > 1.0)' },
            { icon: '📉', title: 'Score Drop', desc: 'Sustainability score drops ≥ 10 pts in 24 hours' },
            { icon: '🔴', title: 'High Risk Status', desc: 'Protocol sustainability score falls below 40' },
            { icon: '💧', title: 'TVL Decline', desc: 'TVL drops more than 5% over 7 days' },
            { icon: '✅', title: 'Improving Signal', desc: 'Revenue growing + emissions declining (positive alert)' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ padding: '10px 12px', background: 'var(--table-header)', borderRadius: 10, border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
