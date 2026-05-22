// src/pages/Compare.jsx
import { useState } from 'react'
import { Card, SectionTitle, ScoreBadge, Button, EmptyState } from '../components/ui'
import { CompareChart } from '../components/RevenueEmissionsChart'
import { useCompare } from '../hooks/useData'
import { fmtUSD, fmtRatio, fmtPct, scoreStatus, CHART_COLORS } from '../utils/format'

const ALL_PROTOCOLS = [
  'aave', 'uniswap', 'gmx', 'curve', 'compound',
  'lido', 'synthetix', 'frax', 'maker', 'convex',
]

export default function Compare() {
  const [selected, setSelected] = useState(['aave', 'gmx', 'lido'])
  const { data, isLoading, error } = useCompare(selected)

  const protocols = data?.protocols || []

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Protocol Comparison</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Select up to 4 protocols to compare side by side
        </p>
      </div>

      {/* Protocol selector */}
      <Card>
        <SectionTitle sub="max 4 protocols">Select Protocols</SectionTitle>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ALL_PROTOCOLS.map((id, i) => {
            const active = selected.includes(id)
            const disabled = !active && selected.length >= 4
            return (
              <button
                key={id}
                onClick={() => !disabled && toggle(id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${active ? CHART_COLORS[selected.indexOf(id) % CHART_COLORS.length] : 'var(--border)'}`,
                  background: active ? 'var(--accent-faint)' : 'transparent',
                  color: active ? 'var(--text-primary)' : disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  textTransform: 'capitalize',
                  transition: 'all 0.15s',
                }}
              >
                {id}
              </button>
            )
          })}
        </div>
      </Card>

      {selected.length === 0 ? (
        <EmptyState message="Select at least one protocol to compare." />
      ) : isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading comparison…</div>
      ) : (
        <>
          {/* Revenue comparison chart */}
          <Card>
            <SectionTitle sub="daily revenue over 30 days">Revenue Trend Comparison</SectionTitle>
            <CompareChart protocols={protocols} height={260} />
          </Card>

          {/* Side-by-side score cards */}
          <div className="compare-cards" style={{ display: 'grid', gridTemplateColumns: `repeat(${protocols.length}, 1fr)`, gap: '1rem' }}>
            {protocols.map((p, i) => {
              const st = scoreStatus(p.sustainability_score)
              const ry = p.real_yield_daily || 0
              const ed = p.emissions_dependency_ratio || 0

              return (
                <Card key={p.id} style={{ borderTop: `3px solid ${CHART_COLORS[i % CHART_COLORS.length]}`, padding: '1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: st.color }}>{p.sustainability_score?.toFixed(0)}</span>
                      <ScoreBadge score={p.sustainability_score} />
                    </div>
                  </div>

                  {[
                    ['Revenue/day', fmtUSD(p.daily_revenue), null],
                    ['Emissions/day', fmtUSD(p.daily_emissions_usd), null],
                    ['Real Yield', (ry >= 0 ? '+' : '−') + fmtUSD(Math.abs(ry)), ry >= 0 ? 'var(--success)' : 'var(--danger)'],
                    ['Em. Ratio', fmtRatio(ed), ed > 1 ? 'var(--danger)' : ed > 0.6 ? 'var(--warning)' : 'var(--success)'],
                    ['TVL', fmtUSD(p.tvl), null],
                    ['TVL 7d', fmtPct(p.tvl_change_pct), p.tvl_change_pct >= 0 ? 'var(--success)' : 'var(--danger)'],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-faint)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span style={{ fontWeight: 600, color: c || 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}

                  {/* Mini insight */}
                  {p.insights?.[0] && (
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      💡 {p.insights[0]}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Comparison table */}
          <Card>
            <SectionTitle sub="head-to-head metrics">Detailed Comparison</SectionTitle>
            <div className="compare-table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--table-header)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>Metric</th>
                    {protocols.map((p, i) => (
                      <th key={p.id} style={{ textAlign: 'right', padding: '8px 12px', color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 700 }}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Sustainability Score', p => p.sustainability_score?.toFixed(0), true],
                    ['Daily Revenue', p => fmtUSD(p.daily_revenue), true],
                    ['Daily Emissions', p => fmtUSD(p.daily_emissions_usd), false],
                    ['Real Yield/day', p => (p.real_yield_daily >= 0 ? '+' : '') + fmtUSD(p.real_yield_daily), true],
                    ['Emissions Ratio', p => fmtRatio(p.emissions_dependency_ratio), false],
                    ['TVL', p => fmtUSD(p.tvl), true],
                    ['TVL 7d Change', p => fmtPct(p.tvl_change_pct), true],
                    ['Profitability', p => p.profitability_status, true],
                    ['Revenue Trend', p => p.score_components?.revenue_trend !== undefined ? `${p.score_components.revenue_trend}/${20} pts` : '—', true],
                  ].map(([label, fn, higherBetter]) => {
                    const values = protocols.map(p => fn(p))
                    return (
                      <tr key={label} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</td>
                        {values.map((v, i) => (
                          <td key={i} style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{v}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
