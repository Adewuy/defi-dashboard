// src/pages/Dashboard.jsx
import EcosystemHeader from '../components/EcosystemHeader'
import ProtocolTable from '../components/ProtocolTable'
import AlertsPanel from '../components/AlertsPanel'
import { Card, SectionTitle, Button } from '../components/ui'
import { useSustainabilityReport, useTriggerPipeline } from '../hooks/useData'
import { scoreStatus, fmtUSD } from '../utils/format'
import { Link } from 'react-router-dom'

function TopProtocolCard({ ranking }) {
  const p = ranking.protocol
  const st = scoreStatus(p.sustainability_score)
  const ry = p.real_yield_daily || 0

  return (
    <Link to={`/protocol/${p.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '12px 14px',
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--card-bg)',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        borderTop: `3px solid ${st.color}`,
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = st.color}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.category}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: st.color }}>{p.sustainability_score?.toFixed(0)}</div>
            <div style={{ fontSize: 10, color: st.color, background: st.bg, padding: '1px 6px', borderRadius: 10, fontWeight: 500 }}>{st.label}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            ['Revenue', fmtUSD(p.daily_revenue)],
            ['Real Yield', (ry >= 0 ? '+' : '−') + fmtUSD(Math.abs(ry))],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { data: report } = useSustainabilityReport()
  const pipelineMutation = useTriggerPipeline()

  const topProtocols  = report?.rankings?.slice(0, 4) || []
  const riskProtocols = report?.rankings?.filter(r => r.protocol.sustainability_score < 40).slice(0, 3) || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>DeFi Sustainability Dashboard</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Real yield analytics · Emissions dependency · Protocol risk scoring
          </p>
        </div>
        <Button
          onClick={() => pipelineMutation.mutate()}
          disabled={pipelineMutation.isPending}
          variant="outline"
          size="sm"
        >
          {pipelineMutation.isPending ? '⏳ Refreshing…' : '🔄 Refresh Data'}
        </Button>
      </div>

      {/* Ecosystem KPIs */}
      <EcosystemHeader />

      {/* Protocol spotlights row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Top performers */}
        <Card>
          <SectionTitle sub="highest sustainability scores">
            🏆 Top Performers
          </SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topProtocols.map(r => <TopProtocolCard key={r.protocol.id} ranking={r} />)}
          </div>
        </Card>

        {/* Risk watch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {riskProtocols.length > 0 && (
            <Card style={{ borderTop: '3px solid var(--danger)' }}>
              <SectionTitle sub="score < 40, elevated risk">🚨 Risk Watch</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {riskProtocols.map(r => {
                  const p = r.protocol
                  const ed = p.emissions_dependency_ratio || 0
                  return (
                    <Link key={p.id} to={`/protocol/${p.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ padding: '10px 12px', background: 'rgba(224,82,82,0.06)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{p.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>{p.sustainability_score?.toFixed(0)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Emissions ratio: {ed.toFixed(2)}x · {ed > 1 ? 'Revenue < Emissions' : 'Marginal'}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Recent alerts */}
          <Card style={{ flex: 1 }}>
            <SectionTitle
              sub="live risk signals"
              action={<Link to="/alerts" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>}
            >
              🔔 Recent Alerts
            </SectionTitle>
            <AlertsPanel maxItems={5} />
          </Card>
        </div>
      </div>

      {/* Full protocol table */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.25rem 0' }}>
          <SectionTitle
            sub="sorted by sustainability score"
            action={<Link to="/protocols" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View full table →</Link>}
          >
            📋 Protocol Rankings
          </SectionTitle>
        </div>
        <ProtocolTable />
      </Card>
    </div>
  )
}
