// src/api/client.js
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Unknown error'
    return Promise.reject(new Error(msg))
  }
)

// ── Protocols ──────────────────────────────────────────────────────────────

export const fetchProtocols = (params = {}) =>
  api.get('/api/protocols', { params })

export const fetchProtocol = (id) =>
  api.get(`/api/protocols/${id}`)

export const fetchProtocolHistory = (id, days = 30) =>
  api.get(`/api/protocols/${id}/history`, { params: { days } })

// ── Analytics ──────────────────────────────────────────────────────────────

export const fetchSustainabilityReport = () =>
  api.get('/api/analytics/ecosystem/summary')

export const fetchCompare = (ids) =>
  api.get('/api/analytics/compare', { params: { ids: ids.join(',') } })

export const fetchEcosystemSummary = () =>
  api.get('/api/analytics/ecosystem/summary')

// ── Alerts ─────────────────────────────────────────────────────────────────

export const fetchAlerts = (params = {}) =>
  api.get('/api/alerts', { params })

export const acknowledgeAlert = (id) =>
  api.post(`/api/alerts/${id}/acknowledge`)

export const sendTestAlert = (message) =>
  api.post('/api/alerts/test', { message })

// ── Health / Admin ─────────────────────────────────────────────────────────

export const fetchHealth = () =>
  api.get('/api/health')

export const triggerPipeline = () =>
  api.post('/api/pipeline/run')
