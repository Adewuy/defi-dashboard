// src/hooks/useData.js
import { useState, useEffect } from 'react';

const API = 'https://sierra-tribune-flammable.ngrok-free.dev';

function useFetch(url, interval = 0) {
  const [data, setData]      = useState(null);
  const [isLoading, setLoad] = useState(true);
  const [error, setError]    = useState(null);

  useEffect(() => {
    if (!url) { setLoad(false); return; }
    let cancelled = false;
    const load = async () => {
      try {
        setLoad(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) { setData(json); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoad(false);
      }
    };
    load();
    if (interval > 0) {
      const t = setInterval(load, interval);
      return () => { cancelled = true; clearInterval(t); };
    }
    return () => { cancelled = true; };
  }, [url]);

  return { data, isLoading, error };
}

function useMutate(url, method = 'POST') {
  const [isLoading, setLoad] = useState(false);
  const [error, setError]    = useState(null);
  const [data, setData]      = useState(null);
  const mutate = async (body) => {
    setLoad(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      return json;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoad(false);
    }
  };
  return { mutate, isLoading, error, data };
}

// ── map a raw ranking object from backend to frontend shape ───
const mapRanking = (r, i) => ({
  protocol: {
    id:                         r.slug || r.protocol || String(i),
    name:                       r.protocol            || '—',
    slug:                       r.slug                || '',
    category:                   r.category            || '—',
    sustainability_score:       typeof r.score === 'number'                      ? r.score                      : 0,
    daily_revenue:              typeof r.revenue_30d === 'number'                ? r.revenue_30d / 30           : 0,
    real_yield_daily:           typeof r.real_yield_monthly === 'number'         ? r.real_yield_monthly / 30    : 0,
    emissions_dependency_ratio: typeof r.emissions_dependency_ratio === 'number' ? r.emissions_dependency_ratio : 0,
    tvl:                        typeof r.tvl === 'number'                        ? r.tvl                        : 0,
    signal:                     r.signal               || '',
    status:                     r.status               || '',
    risk_level:                 r.risk_level           || '',
    profitability_status:       r.profitability_status || '',
  }
});

// ── Core data hooks ───────────────────────────────────────────
export const useDashboard      = () => useFetch(`${API}/api/analytics/dashboard`,      60000);
export const useProtocols      = () => useFetch(`${API}/api/protocols/rankings`,        60000);
export const useProtocol       = (slug) => useFetch(slug ? `${API}/api/protocols/${slug}` : null);
export const useAlerts         = () => useFetch(`${API}/api/alerts/`,                   30000);
export const useMarketHealth   = () => useFetch(`${API}/api/analytics/market-health`,   60000);
export const useHealth         = () => useFetch(`${API}/api/health`,                    30000);
export const useProtocolAlerts = (slug) => useFetch(slug ? `${API}/api/alerts/${slug}` : null, 30000);
export const useCompare        = (slugs = []) => useFetch(
  slugs.length > 0 ? `${API}/api/analytics/compare?slugs=${slugs.join(',')}` : null
);

// ── Ecosystem summary (used by EcosystemHeader) ───────────────
export const useEcosystemSummary = () => {
  const { data, isLoading, error } = useFetch(`${API}/api/analytics/dashboard`, 60000);
  return {
    data: data ? {
      avg_score:        data.avg_sustainability_score || 0,
      total_protocols:  data.total_protocols_tracked  || 0,
      high_risk_count:  data.high_risk_count          || 0,
      profitable_count: data.profitable_count         || 0,
      ecosystem_signal: data.ecosystem_signal         || '',
      market_health:    data.market_health_score      || 0,
    } : null,
    isLoading,
    error,
  };
};

// ── Sustainability report (used by Dashboard) ─────────────────
export const useSustainabilityReport = () => {
  const { data, isLoading, error } = useFetch(`${API}/api/analytics/dashboard`, 60000);
  return {
    data: data ? {
      rankings:         (data.full_rankings  || []).map(mapRanking),
      top_protocols:    (data.top_protocols  || []).map(mapRanking),
      recent_alerts:    data.recent_alerts   || [],
      avg_score:        data.avg_sustainability_score || 0,
      high_risk_count:  data.high_risk_count          || 0,
      profitable_count: data.profitable_count         || 0,
      total:            data.total_protocols_tracked  || 0,
      market_health:    data.market_health_score      || 0,
      ecosystem_signal: data.ecosystem_signal         || '',
    } : null,
    isLoading,
    error,
  };
};

// ── Pipeline trigger (used by Dashboard) ─────────────────────
export const useTriggerPipeline = () => {
  const [isLoading, setLoad] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const mutate = async () => {
    setLoad(true);
    try {
      const res = await fetch(`${API}/api/pipeline/run`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setLastRun(json?.ran_at || new Date().toISOString());
      }
    } catch (e) {
      // pipeline endpoint is optional — silently ignore
    } finally {
      setLoad(false);
    }
  };
  return { mutate, isLoading, lastRun };
};

// ── Alert actions ─────────────────────────────────────────────
export const useAcknowledgeAlert = () => {
  const [isLoading, setLoad] = useState(false);
  const mutate = async (alertId) => {
    setLoad(true);
    try {
      await fetch(`${API}/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
    } finally { setLoad(false); }
  };
  return { mutate, isLoading };
};

export const useSendTestAlert = () => {
  const [isLoading, setLoad] = useState(false);
  const mutate = async (msg) => {
    setLoad(true);
    try {
      await fetch(`${API}/api/alerts/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
    } finally { setLoad(false); }
  };
  return { mutate, isLoading };
};

// ── Settings ──────────────────────────────────────────────────
export const useSettings = () => {
  const [settings, setSettings] = useState({
    alertThreshold:  30,
    refreshInterval: 60,
    telegramEnabled: false,
  });
  const updateSetting = (key, value) =>
    setSettings(prev => ({ ...prev, [key]: value }));
  return { settings, updateSetting };
};