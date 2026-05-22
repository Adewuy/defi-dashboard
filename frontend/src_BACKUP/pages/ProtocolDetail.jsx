// src/pages/ProtocolDetail.jsx
import { useParams, Link } from 'react-router-dom'
import { useProtocol } from '../hooks/useData'
import { Card, SectionTitle, ScoreBadge, StatCard, ErrorState, Skeleton } from '../components/ui'
import { ProtocolRevenueChart, RealYieldChart, TVLChart } from '../components/RevenueEmissionsChart'
import ScoreBreakdown from '../components/ScoreBreakdown'
import { fmtUSD, fmtRatio, fmtPct, scoreStatus } from '../utils/format'

const PROFITABILITY_LABELS = {
  profitable:   { label: '✅ Profitable',  color: 'var(--success)' },
  unprofitable: { label: '❌ Unprofitable', color: 'var(--danger)' },
  break_even:   { label: '〰️ Break-even',   color: 'var(--warning)' },
  unknown:      { label: '❓ Unknown',       color: 'var(--text-muted)' },
}

export default function ProtocolDetail() {
  const { id } = useParams()
  const { data: protocol, isLoading, error, refetch } = useProtocol(id)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Skeleton height={40} width="40%" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} height={90} />)}
        </div>
        <Skeleton height={260} />
      </div>
    )
  }

  if (error) return <ErrorState message={error.message} onRetry={refetch} />
  if (!protocol) return null

  const st = scoreStatus(protocol.sustainability_score)
  const ry = protocol.real_yield_daily || 0
  const prof = PROFITABILITY_LABELS[protocol.profitability_status] || PROFITABILITY_LABELS.unknown

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Breadcrumb + header */}
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
          <span> / </span>
          <Link to="/protocols" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Protocols</Link>
          <span style={{ color: 'var(--text-primary)' }}> / {protocol.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{protocol.name}</h1>
          {protocol.category && (
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--table-header)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {protocol.category}
            </span>
          )}
          <ScoreBadge score={protocol.sustainability_score} size="md" />
          <span style={{ fontSize: 13, color: prof.color, fontWeight: 500 }}>{prof.label}</span>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <StatCard icon="📈" label="Sustainability Score" value={`${protocol.sustainability_score?.toFixed(0)}/100`} color={st.color} />
        <StatCard icon="💰" label="Daily Revenue" value={fmtUSD(protocol.daily_revenue)} sub={`${fmtUSD(protocol.weekly_revenue)}/week`} />
        <StatCard icon="💸" label="Daily Emissions" value={fmtUSD(protocol.daily_emissions_usd)} sub={`ratio: ${fmtRatio(protocol.emissions_dependency_ratio)}`} color="var(--warning)" />
        <StatCard icon="✨" label="Real Yield/day" value={(ry >= 0 ? '+' : '') + fmtUSD(ry)} color={ry >= 0 ? 'var(--success)' : 'var(--danger)'} />
        <StatCard icon="🏦" label="TVL" value={fmtUSD(protocol.tvl)} sub={`${fmtPct(protocol.tvl_change_pct)} (7d)`} />
        <StatCard icon="🪙" label="Token Price" value={`$${protocol.token_price?.toFixed(4)}`} sub={protocol.token_symbol} />
      </div>

      {/* Main content: chart + score breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card>
            <SectionTitle sub="solid = revenue · dashed = emissions">Revenue vs Emissions (30d)</SectionTitle>
            <ProtocolRevenueChart
              revenueHistory={protocol.revenue_history}
              emissionsHistory={protocol.emissions_history}
              height={240}
            />
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <Card>
              <SectionTitle sub="revenue minus emissions per day">Real Yield Trend</SectionTitle>
              <RealYieldChart
                revenueHistory={protocol.revenue_history}
                emissionsHistory={protocol.emissions_history}
                height={180}
              />
            </Card>
            <Card>
              <SectionTitle sub="total value locked (30d)">TVL History</SectionTitle>
              <TVLChart tvlHistory={protocol.tvl_history} height={180} />
            </Card>
          </div>
        </div>

        {/* Score breakdown sidebar */}
        <ScoreBreakdown
          score={protocol.sustainability_score}
          components={protocol.score_components}
          insights={protocol.insights}
        />
      </div>

      {/* Metrics table */}
      <Card>
        <SectionTitle>Protocol Metrics</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            ['Daily Revenue', fmtUSD(protocol.daily_revenue)],
            ['Weekly Revenue', fmtUSD(protocol.weekly_revenue)],
            ['Monthly Revenue', fmtUSD(protocol.monthly_revenue)],
            ['Daily Fees', fmtUSD(protocol.daily_fees)],
            ['Daily Emissions', fmtUSD(protocol.daily_emissions_usd)],
            ['Real Yield/day', (ry >= 0 ? '+' : '') + fmtUSD(ry)],
            ['Emissions Ratio', fmtRatio(protocol.emissions_dependency_ratio)],
            ['TVL', fmtUSD(protocol.tvl)],
            ['TVL 7d Change', fmtPct(protocol.tvl_change_pct)],
            ['Token Symbol', protocol.token_symbol || '—'],
            ['Token Price', `$${protocol.token_price?.toFixed(4)}`],
            ['Profitability', prof.label],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
