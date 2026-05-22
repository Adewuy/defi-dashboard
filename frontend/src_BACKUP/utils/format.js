// src/utils/format.js

export const fmtUSD = (value, decimals = 1) => {
  if (value === null || value === undefined) return '$—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(decimals)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(decimals)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`
  return `${sign}$${abs.toFixed(0)}`
}

export const fmtPct = (value, decimals = 1) => {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export const fmtScore = (score) => {
  if (score === null || score === undefined) return '—'
  return score.toFixed(0)
}

export const fmtRatio = (ratio, decimals = 2) => {
  if (ratio === null || ratio === undefined) return '—'
  if (ratio >= 99) return '∞'
  return `${ratio.toFixed(decimals)}x`
}

export const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const fmtDateShort = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const scoreStatus = (score) => {
  if (score >= 80) return { label: 'Healthy', color: '#1D9E75', bg: 'rgba(29,158,117,0.12)', textColor: '#0d6e50' }
  if (score >= 60) return { label: 'Stable', color: '#378ADD', bg: 'rgba(55,138,221,0.12)', textColor: '#1a5fa3' }
  if (score >= 40) return { label: 'Warning', color: '#E09B2D', bg: 'rgba(224,155,45,0.12)', textColor: '#8a5a00' }
  return { label: 'High Risk', color: '#E05252', bg: 'rgba(224,82,82,0.12)', textColor: '#9c1c1c' }
}

export const severityColor = (severity) => {
  switch (severity) {
    case 'critical': return { icon: '🚨', color: '#E05252', bg: 'rgba(224,82,82,0.08)', border: 'rgba(224,82,82,0.25)' }
    case 'warning':  return { icon: '⚠️', color: '#E09B2D', bg: 'rgba(224,155,45,0.08)', border: 'rgba(224,155,45,0.25)' }
    default:         return { icon: 'ℹ️', color: '#378ADD', bg: 'rgba(55,138,221,0.08)', border: 'rgba(55,138,221,0.25)' }
  }
}

export const CHART_COLORS = [
  '#378ADD', '#1D9E75', '#E09B2D', '#E05252',
  '#9B72DD', '#E07840', '#56B868', '#D45E8E',
]

export const buildDayLabels = (count) => {
  const labels = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  }
  return labels
}
