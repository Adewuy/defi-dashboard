// src/components/AlertsPanel.jsx
import { useState } from 'react'
import { Card, SectionTitle, AlertRow, Button, Select, EmptyState, Skeleton } from './ui'
import { useAlerts, useAcknowledgeAlert } from '../hooks/useData'

export default function AlertsPanel({ maxItems = 8, showFilters = false }) {
  const [severity, setSeverity] = useState('')
  const [unackOnly, setUnackOnly] = useState(false)

  const { data, isLoading } = useAlerts({
    severity: severity || undefined,
    unacknowledged_only: unackOnly || undefined,
    limit: maxItems,
  })
  const ackMutation = useAcknowledgeAlert()

  if (isLoading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{[...Array(4)].map((_, i) => <Skeleton key={i} height={60} />)}</div>

  const alerts = data?.alerts || []
  const critical = data?.critical_count || 0
  const warnings = data?.warning_count || 0

  return (
    <div>
      {showFilters && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            value={severity}
            onChange={setSeverity}
            options={[
              { value: '', label: 'All Severities' },
              { value: 'critical', label: '🚨 Critical' },
              { value: 'warning',  label: '⚠️  Warning' },
              { value: 'info',     label: 'ℹ️  Info' },
            ]}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={unackOnly} onChange={e => setUnackOnly(e.target.checked)} />
            Unacknowledged only
          </label>
          <div style={{ marginLeft: 'auto', fontSize: 12, display: 'flex', gap: 10 }}>
            {critical > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>🚨 {critical} critical</span>}
            {warnings > 0 && <span style={{ color: 'var(--warning)', fontWeight: 600 }}>⚠️ {warnings} warnings</span>}
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <EmptyState message="No alerts match your filters." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {alerts.map(a => (
            <AlertRow
              key={a.id}
              alert={a}
              onAck={id => ackMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
