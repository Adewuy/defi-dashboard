// src/pages/Dashboard.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSustainabilityReport, useTriggerPipeline } from '../hooks/useData'
import { scoreStatus, fmtUSD } from '../utils/format'

const scoreColor = score => {
  if (score >= 70) return '#10b981'
  if (score >= 50) return '#3b82f6'
  if (score >= 35) return '#f59e0b'
  return '#ef4444'
}

const riskConfig = {
  Healthy:     { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  Stable:      { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  'High Risk': { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
}

const categoryColors = {
  'Liquid Staking': '#8b5cf6',
  Stablecoin:       '#06b6d4',
  Perps:            '#f97316',
  Lending:          '#3b82f6',
  DEX:              '#10b981',
  Yield:            '#f59e0b',
  Derivatives:      '#ec4899',
}

function getRiskLabel(score) {
  if (score == null) return 'High Risk'
  if (score >= 70)   return 'Healthy'
  if (score >= 45)   return 'Stable'
  return 'High Risk'
}

function toCard(ranking, index) {
  const p     = ranking.protocol
  const score = p.sustainability_score != null ? Math.round(p.sustainability_score) : null
  const ry    = p.real_yield_daily || 0
  const ed    = p.emissions_dependency_ratio || 0
  return {
    rank:           index + 1,
    id:             p.id,
    name:           p.name || '—',
    category:       p.category || '—',
    score,
    riskLabel:      getRiskLabel(score),
    tvl:            fmtUSD(p.total_tvl),
    revenue:        fmtUSD(p.daily_revenue),
    realYield:      (ry >= 0 ? '+' : '−') + fmtUSD(Math.abs(ry)),
    yieldTrend:     ry >= 0 ? 'up' : 'down',
    emissionsRatio: ed > 0 ? ed.toFixed(2) + 'x' : null,
  }
}

function KpiStrip({ report }) {
  const rankings       = report?.rankings || []
  const totalRevenue   = rankings.reduce((s, r) => s + (r.protocol.daily_revenue   || 0), 0)
  const totalEmissions = rankings.reduce((s, r) => s + (r.protocol.daily_emissions || 0), 0)
  const realYield      = totalRevenue - totalEmissions
  const totalTvl       = rankings.reduce((s, r) => s + (r.protocol.total_tvl       || 0), 0)
  const avgScore       = rankings.length
    ? (rankings.reduce((s, r) => s + (r.protocol.sustainability_score || 0), 0) / rankings.length).toFixed(0)
    : 0
  const healthy = rankings.filter(r => (r.protocol.sustainability_score ?? 0)   >= 70).length
  const atRisk  = rankings.filter(r => (r.protocol.sustainability_score ?? 100) <  40).length

  const kpis = [
    { icon: '💰', label: 'Daily Revenue',   value: fmtUSD(totalRevenue),   sub: 'all tracked protocols' },
    { icon: '🌿', label: 'Daily Emissions', value: fmtUSD(totalEmissions),  sub: 'token incentive cost' },
    { icon: '✨', label: 'Real Yield',       value: fmtUSD(realYield),       sub: 'revenue minus emissions', color: realYield >= 0 ? '#10b981' : '#ef4444' },
    { icon: '🏦', label: 'Total TVL',        value: fmtUSD(totalTvl),        sub: `${rankings.length} protocols` },
    { icon: '⚡', label: 'Avg Score',        value: `${avgScore}/100`,       sub: `${healthy} healthy · ${atRisk} at risk`, color: scoreColor(Number(avgScore)) },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {kpis.map(k => (
        <div key={k.label} style={{
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>{k.icon}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{k.label}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: k.color || 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>
            {k.value}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{k.sub}</div>
        </div>
      ))}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 14, border: '1px solid var(--border)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--skeleton-a)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, width: '55%', borderRadius: 4, background: 'var(--skeleton-a)', marginBottom: 8 }} />
          <div style={{ height: 11, width: '35%', borderRadius: 4, background: 'var(--skeleton-a)' }} />
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--skeleton-a)' }} />
      </div>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', gap: 20 }}>
        <div style={{ height: 11, width: 60, borderRadius: 4, background: 'var(--skeleton-a)' }} />
        <div style={{ height: 11, width: 60, borderRadius: 4, background: 'var(--skeleton-a)' }} />
      </div>
    </div>
  )
}

function ProtocolCard({ p }) {
  const navigate = useNavigate()
  const risk     = riskConfig[p.riskLabel] || riskConfig['High Risk']
  const catColor = categoryColors[p.category] || '#6b7280'
  const sc       = scoreColor(p.score ?? 0)

  return (
    <div
      onClick={() => p.id && navigate(`/protocol/${p.id}`)}
      style={{
        background: 'var(--card-bg)', borderRadius: 14,
        border: '1px solid var(--border)', padding: '14px 16px',
        cursor: p.id ? 'pointer' : 'default', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { if (p.id) e.currentTarget.style.borderColor = sc }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 26, height: 26, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8,
          background: p.rank <= 3 ? '#fef3c7' : 'var(--skeleton-a)',
          fontSize: 11, fontWeight: 700,
          color: p.rank <= 3 ? '#d97706' : 'var(--text-muted)',
        }}>
          {p.rank}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              {p.name}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
              background: catColor + '22', color: catColor,
            }}>
              {p.category}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
              background: risk.bg, color: risk.text,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: risk.dot, display: 'inline-block' }} />
              {p.riskLabel}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              TVL: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.tvl}</span>
            </span>
          </div>
        </div>

        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: sc, lineHeight: 1, letterSpacing: '-1px' }}>
            {p.score != null ? p.score : '—'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>
            score
          </div>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: 'var(--border)', marginTop: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: (p.score ?? 0) + '%', background: sc, borderRadius: 2 }} />
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)',
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>REVENUE</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.revenue}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>REAL YIELD</div>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: p.yieldTrend === 'down' ? '#ef4444' : '#10b981',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            {p.realYield}
            <span style={{ fontSize: 10 }}>{p.yieldTrend === 'down' ? '▼' : '▲'}</span>
          </div>
        </div>
        {p.emissionsRatio && (
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>EMISSIONS</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: parseFloat(p.emissionsRatio) > 1 ? '#ef4444' : 'var(--text-primary)' }}>
              {p.emissionsRatio}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [sortBy, setSortBy] = useState('rank')

  const { data: report, isLoading } = useSustainabilityReport()
  const pipelineMutation = useTriggerPipeline()

  const cards      = (report?.rankings || []).map((r, i) => toCard(r, i))
  const categories = ['All', ...Array.from(new Set(cards.map(p => p.category)))]

  const filtered = cards
    .filter(p => {
      if (filter !== 'All' && p.category !== filter) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) =>
      sortBy === 'score'
        ? (b.score ?? -1) - (a.score ?? -1)
        : a.rank - b.rank
    )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: 80 }}>

      <div style={{
        background: 'var(--card-bg)', borderBottom: '1px solid var(--border)',
        padding: '18px 16px 0', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              DeFi Sustainability Dashboard
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Real yield · Emissions · Risk scoring
            </div>
          </div>
          <button
            onClick={() => pipelineMutation.mutate()}
            disabled={pipelineMutation.isLoading}
            style={{
              fontSize: 11, padding: '5px 10px', borderRadius: 8, flexShrink: 0,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)',
              cursor: pipelineMutation.isLoading ? 'not-allowed' : 'pointer',
              opacity: pipelineMutation.isLoading ? 0.6 : 1,
            }}
          >
            {pipelineMutation.isLoading ? '⏳' : '🔄'} Refresh
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search protocols…"
            style={{
              width: '100%', boxSizing: 'border-box',
              paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              border: '1px solid var(--border)', borderRadius: 10,
              fontSize: 13, background: 'var(--bg)', outline: 'none',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                whiteSpace: 'nowrap', flexShrink: 0,
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: filter === cat ? '1.5px solid #6366f1' : '1px solid var(--border)',
                background: filter === cat ? '#eef2ff' : 'transparent',
                color: filter === cat ? '#4f46e5' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '8px 0 10px', borderTop: '1px solid var(--border)', marginTop: 8,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 6 }}>Sort</span>
          {['rank', 'score'].map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{
              padding: '3px 9px', marginRight: 4, borderRadius: 6, fontSize: 11, fontWeight: 500,
              border: '1px solid ' + (sortBy === s ? '#6366f1' : 'var(--border)'),
              background: sortBy === s ? '#eef2ff' : 'transparent',
              color: sortBy === s ? '#4f46e5' : 'var(--text-muted)',
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {s === 'rank' ? 'Rank' : 'Score'}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            {filtered.length} protocols
          </span>
        </div>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        {isLoading
          ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: 88, borderRadius: 12, background: 'var(--skeleton-a)' }} />
              ))}
            </div>
          ) : (
            <KpiStrip report={report} />
          )
        }
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading && [...Array(6)].map((_, i) => <SkeletonCard key={i} />)}

        {!isLoading && filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            color: 'var(--text-muted)', fontSize: 13,
            background: 'var(--card-bg)', borderRadius: 14,
            border: '1px solid var(--border)',
          }}>
            {cards.length === 0
              ? '⚠️ No data — make sure the backend is running and VITE_API_URL is set in Vercel environment variables.'
              : '🔍 No protocols match your search.'}
          </div>
        )}

        {!isLoading && filtered.map(p => <ProtocolCard key={p.id || p.rank} p={p} />)}
      </div>

      {!isLoading && (
        <div style={{ padding: '12px 16px 0' }}>
          <Link to="/alerts" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>🔔 Recent Alerts</span>
              <span style={{ fontSize: 12, color: 'var(--accent)' }}>View all →</span>
            </div>
          </Link>
        </div>
      )}

    </div>
  )
}