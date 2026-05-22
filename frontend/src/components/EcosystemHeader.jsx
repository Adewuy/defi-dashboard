// src/components/EcosystemHeader.jsx
import { StatCard, Skeleton } from './ui'
import { fmtUSD, fmtScore } from '../utils/format'
import { useEcosystemSummary } from '../hooks/useData'

export default function EcosystemHeader() {
  const { data, isLoading } = useEcosystemSummary()

  if (isLoading) {
    return (
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {[...Array(5)].map((_, i) => <Skeleton key={i} height={80} />)}
      </div>
    )
  }

  if (!data) return null

  const realYield = data.ecosystem_real_yield_usd || 0
  const avgScore  = data.average_sustainability_score || 0

  return (
    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
      <StatCard
        icon="💰"
        label="Daily Revenue"
        value={fmtUSD(data.total_daily_revenue_usd)}
        sub="all tracked protocols"
      />
      <StatCard
        icon="💸"
        label="Daily Emissions"
        value={fmtUSD(data.total_daily_emissions_usd)}
        sub="token incentive cost"
        color="var(--warning)"
      />
      <StatCard
        icon="✨"
        label="Real Yield"
        value={fmtUSD(realYield)}
        sub="revenue minus emissions"
        color={realYield >= 0 ? 'var(--success)' : 'var(--danger)'}
      />
      <StatCard
        icon="🏦"
        label="Total TVL"
        value={fmtUSD(data.total_tvl_usd)}
        sub={`${data.total_protocols} protocols`}
      />
      <StatCard
        icon="⚡"
        label="Avg Score"
        value={`${fmtScore(avgScore)}/100`}
        sub={`${data.protocols_by_status?.healthy || 0} healthy · ${data.protocols_by_status?.high_risk || 0} at risk`}
        color={avgScore >= 65 ? 'var(--success)' : avgScore >= 45 ? 'var(--warning)' : 'var(--danger)'}
      />
    </div>
  )
}
