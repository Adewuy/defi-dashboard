// src/pages/Protocols.jsx
import { Card } from '../components/ui'
import EcosystemHeader from '../components/EcosystemHeader'
import ProtocolTable from '../components/ProtocolTable'

export default function Protocols() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>All Protocols</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Sort and filter all tracked DeFi protocols by sustainability metrics
        </p>
      </div>

      <EcosystemHeader />

      {/* Scoring legend */}
      <Card style={{ padding: '0.875rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Score bands:</span>
          {[
            ['80–100', 'Healthy',   '#1D9E75'],
            ['60–79',  'Stable',    '#378ADD'],
            ['40–59',  'Warning',   '#E09B2D'],
            ['0–39',   'High Risk', '#E05252'],
          ].map(([range, label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{range}</span>
            </div>
          ))}
        </div>
      </Card>

      <ProtocolTable />
    </div>
  )
}
