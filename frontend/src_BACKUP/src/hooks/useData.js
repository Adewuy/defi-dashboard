// src/hooks/useData.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchProtocols, fetchProtocol, fetchProtocolHistory,
  fetchSustainabilityReport, fetchCompare, fetchEcosystemSummary,
  fetchAlerts, acknowledgeAlert, sendTestAlert,
  fetchHealth, triggerPipeline,
} from '../api/client'

const STALE_5MIN = 5 * 60 * 1000
const STALE_1MIN = 60 * 1000

export const useProtocols = (params) =>
  useQuery({
    queryKey: ['protocols', params],
    queryFn: () => fetchProtocols(params),
    staleTime: STALE_5MIN,
    refetchInterval: STALE_5MIN,
  })

export const useProtocol = (id) =>
  useQuery({
    queryKey: ['protocol', id],
    queryFn: () => fetchProtocol(id),
    enabled: !!id,
    staleTime: STALE_5MIN,
  })

export const useProtocolHistory = (id, days) =>
  useQuery({
    queryKey: ['protocol-history', id, days],
    queryFn: () => fetchProtocolHistory(id, days),
    enabled: !!id,
    staleTime: STALE_5MIN,
  })

export const useSustainabilityReport = () =>
  useQuery({
    queryKey: ['sustainability-report'],
    queryFn: fetchSustainabilityReport,
    staleTime: STALE_5MIN,
    refetchInterval: STALE_5MIN,
  })

export const useCompare = (ids) =>
  useQuery({
    queryKey: ['compare', ids],
    queryFn: () => fetchCompare(ids),
    enabled: ids.length > 0,
    staleTime: STALE_5MIN,
  })

export const useEcosystemSummary = () =>
  useQuery({
    queryKey: ['ecosystem-summary'],
    queryFn: fetchEcosystemSummary,
    staleTime: STALE_1MIN,
    refetchInterval: STALE_1MIN,
  })

export const useAlerts = (params) =>
  useQuery({
    queryKey: ['alerts', params],
    queryFn: () => fetchAlerts(params),
    staleTime: STALE_1MIN,
    refetchInterval: STALE_1MIN,
  })

export const useHealth = () =>
  useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

export const useAcknowledgeAlert = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

export const useTriggerPipeline = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: triggerPipeline,
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries()
      }, 3000)
    },
  })
}

export const useSendTestAlert = () =>
  useMutation({ mutationFn: (msg) => sendTestAlert(msg) })
