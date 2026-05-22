// src/components/ScoreBreakdown.jsx
import { Card } from './ui'
import { scoreStatus } from '../utils/format'

const COMPONENTS = [
  { key: 'real_yield',           label: 'Real Yield',           max: 30, icon: '✨', desc: 'Revenue minus token emissions cost' },
  { key: 'emissions_dependency', label: 'Emissions Dependency', max: 25, icon: '💸', desc: 'Lower emission reliance scores higher' },
  { key: 'revenue_trend',        label: 'Revenue Trend',        max: 20, icon: '📈', desc: '7-day revenue trajectory' },
  { key: 'tvl_trend',            label: 'TVL Trend',            max: 15, icon: '🏦', desc: '7-day TVL change' },
  { key: 'user_activity',        label: 'User Activity',        max: 10, icon: '👥', desc: 'User growth week-over-week' },
]

export default function ScoreBreakdown({ score, components, insights }) {
  if (!components) return null
  const st = scoreStatus(score)

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: `conic-gradient(${st.color} ${score * 3.6}deg, var(--border) 0)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: st.color }}>{score?.toFixed(0)}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: st.color }}>{st.label}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sustainability Score / 100</div>
        </div>
      </div>

      {/* Component bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: insights?.length ? '1.25rem' : 0 }}>
        {COMPONENTS.map(c => {
          const val = components[c.key] || 0
          const pct = (val / c.max) * 100
          const barColor = pct >= 70 ? '#1D9E75' : pct >= 40 ? '#E09B2D' : '#E05252'
          return (
            <div key={c.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: barColor }}>{val.toFixed(1)} / {c.max}</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.desc}</div>
            </div>
          )
        })}
      </div>

      {/* Insights */}
      {insights?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            💡 Insights
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text-primary)', padding: '8px 10px', background: 'var(--table-header)', borderRadius: 8, lineHeight: 1.5 }}>
                {ins}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
