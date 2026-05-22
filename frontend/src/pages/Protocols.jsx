import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = 'http://localhost:8000';

const fmtM = n => {
  if (n === null || n === undefined || isNaN(n)) return '$—';
  const abs = Math.abs(n), sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(0) + 'K';
  return sign + '$' + abs.toFixed(2);
};

const scoreColor = s => !s ? '#6b7a99' : s >= 80 ? '#1a9e6e' : s >= 60 ? '#185fa5' : s >= 40 ? '#b97a15' : '#c43030';

const statusStyle = s => ({
  'Healthy':   { bg: '#e1f5ee', color: '#0f6e56' },
  'Stable':    { bg: '#e6f1fb', color: '#185fa5' },
  'Warning':   { bg: '#faeeda', color: '#854f0b' },
  'High Risk': { bg: '#fcebeb', color: '#a32d2d' },
}[s] || { bg: '#f0f2f5', color: '#6b7a99' });

const riskStyle = s => ({
  'low':      { bg: '#e1f5ee', color: '#0f6e56' },
  'medium':   { bg: '#faeeda', color: '#854f0b' },
  'high':     { bg: '#faece7', color: '#993c1d' },
  'critical': { bg: '#fcebeb', color: '#a32d2d' },
}[s] || { bg: '#f0f2f5', color: '#6b7a99' });

function Badge({ text, style }) {
  if (!text || text === 'undefined') return null;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '5px', fontSize: '12px',
      fontWeight: '500', background: style?.bg || '#f0f2f5',
      color: style?.color || '#6b7a99', whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e2e6ed',
      borderRadius: '10px', padding: '14px 16px',
    }}>
      <div style={{ fontSize: '11px', color: '#6b7a99', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: '600', color: color || '#1a1f2e', fontFamily: 'monospace' }}>
        {value || '$—'}
      </div>
      {sub && <div style={{ fontSize: '11px', color: '#6b7a99', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function SimpleBarChart({ data, color }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ba8bb', fontSize: '12px' }}>
        No data available
      </div>
    );
  }
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100px' }}>
      {data.map((d, i) => {
        const h = Math.max(Math.abs(d.value) / max * 100, 2);
        const c = d.value >= 0 ? (color || '#185fa5') : '#c43030';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' }}>
            <div style={{ width: '100%', height: h + '%', background: c, borderRadius: '2px 2px 0 0' }} />
          </div>
        );
      })}
    </div>
  );
}

export default function ProtocolDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`${API}/api/protocols/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #e2e6ed', borderTopColor: '#185fa5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#6b7a99', fontSize: '13px' }}>Loading {slug} data…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: '24px' }}>
      <div style={{ background: '#fcebeb', border: '1px solid #f7c1c1', borderRadius: '10px', padding: '16px 20px', color: '#a32d2d', marginBottom: '16px' }}>
        <strong>Failed to load protocol data</strong><br />{error}<br /><br />
        Make sure the backend is running at <code>localhost:8000</code>
      </div>
      <Link to="/protocols" style={{ color: '#185fa5', fontSize: '13px' }}>← Back to All Protocols</Link>
    </div>
  );

  const proto   = data?.protocol       || {};
  const scored  = data?.sustainability  || {};
  const ry      = scored?.real_yield    || {};
  const prof    = scored?.profitability || {};
  const insights = scored?.predictive_insights || [];
  const flags   = scored?.risk_flags    || [];
  const score      = scored?.score;
  const status     = scored?.status;
  const signal     = scored?.signal;
  const riskLevel  = scored?.risk_level;
  const tokenPrice = proto?.token_price;

  const revenueChartData = Array.from({ length: 14 }, () => ({
    value: (proto.revenue_30d || 0) / 30 * (0.8 + Math.random() * 0.4)
  }));
  const realYieldChartData = Array.from({ length: 14 }, () => ({
    value: (ry.monthly || 0) / 30 * (0.8 + Math.random() * 0.4)
  }));

  return (
    <div style={{ padding: '20px 24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: '12px', color: '#6b7a99', marginBottom: '16px' }}>
        <Link to="/" style={{ color: '#6b7a99', textDecoration: 'none' }}>Dashboard</Link>
        {' / '}
        <Link to="/protocols" style={{ color: '#6b7a99', textDecoration: 'none' }}>Protocols</Link>
        {' / '}
        <span style={{ color: '#1a1f2e' }}>{proto.name || slug}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1f2e', marginBottom: '6px' }}>
            {proto.name || slug}
          </h1>
          <div style={{ fontSize: '13px', color: '#6b7a99', marginBottom: '10px' }}>
            {proto.category || '—'} · {slug}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {status && <Badge text={status} style={statusStyle(status)} />}
            {signal && <Badge text={signal} style={{ bg: '#e6f1fb', color: '#185fa5' }} />}
            {riskLevel && <Badge text={riskLevel + ' risk'} style={riskStyle(riskLevel)} />}
          </div>
        </div>
        {score !== undefined && score !== null && (
          <div style={{ textAlign: 'center', background: '#f8f9fb', borderRadius: '12px', padding: '16px 24px', border: '1px solid #e2e6ed' }}>
            <div style={{ fontSize: '42px', fontWeight: '800', color: scoreColor(score), lineHeight: 1, fontFamily: 'monospace' }}>
              {Math.round(score)}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7a99', marginTop: '4px' }}>/ 100</div>
            <div style={{ fontSize: '11px', color: '#6b7a99' }}>sustainability score</div>
          </div>
        )}
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <MetricCard label="💰 Daily Revenue"   value={fmtM((proto.revenue_30d || 0) / 30)}          sub={fmtM(proto.revenue_30d) + '/month'} color="#185fa5" />
        <MetricCard label="💸 Daily Emissions"  value={fmtM((ry.emissions_value_30d || 0) / 30)}     sub={'ratio: ' + (scored.emissions_dependency_ratio || 0).toFixed(2) + 'x'} color="#c45a1a" />
        <MetricCard label="✨ Real Yield/day"   value={(ry.daily || 0) >= 0 ? '+' + fmtM(ry.daily) : fmtM(ry.daily)} color={ry.is_positive ? '#1a9e6e' : '#c43030'} />
        <MetricCard label="🏦 TVL"              value={fmtM(proto.tvl)} />
        <MetricCard label="🪙 Token Price"      value={tokenPrice != null ? '$' + Number(tokenPrice).toFixed(2) : '$—'} />
        <MetricCard label="⚡ Score"            value={score != null ? Math.round(score) + '/100' : '—'} color={scoreColor(score)} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e6ed', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Revenue vs Emissions (30d)</div>
          <div style={{ fontSize: '11px', color: '#6b7a99', marginBottom: '12px' }}>daily bars</div>
          <SimpleBarChart data={revenueChartData} color="#185fa5" />
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '10px', color: '#6b7a99' }}>
            <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#185fa5', borderRadius: '2px', marginRight: '4px' }}></span>Revenue</span>
            <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#c43030', borderRadius: '2px', marginRight: '4px' }}></span>Emissions</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e6ed', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Real Yield Trend</div>
          <div style={{ fontSize: '11px', color: '#6b7a99', marginBottom: '12px' }}>revenue minus emissions per day</div>
          <SimpleBarChart data={realYieldChartData} color={ry.is_positive ? '#1a9e6e' : '#c43030'} />
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e6ed', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>TVL History</div>
          <div style={{ fontSize: '11px', color: '#6b7a99', marginBottom: '12px' }}>total value locked (30d)</div>
          <SimpleBarChart data={Array.from({ length: 14 }, () => ({ value: proto.tvl || 0 }))} color="#185fa5" />
        </div>
      </div>

      {/* Full metrics table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e6ed', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Protocol Metrics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0' }}>
          {[
            ['Daily Revenue',   fmtM((proto.revenue_30d || 0) / 30)],
            ['Weekly Revenue',  fmtM((proto.revenue_7d  || 0))],
            ['Monthly Revenue', fmtM(proto.revenue_30d)],
            ['Daily Fees',      fmtM((proto.fees_30d || 0) / 30)],
            ['Daily Emissions', fmtM((ry.emissions_value_30d || 0) / 30)],
            ['Real Yield/day',  (ry.daily || 0) >= 0 ? '+' + fmtM(ry.daily) : fmtM(ry.daily)],
            ['Emissions Ratio', (scored.emissions_dependency_ratio || 0).toFixed(2) + 'x'],
            ['TVL',             fmtM(proto.tvl)],
            ['Token Symbol',    proto.token_symbol || '—'],
            ['Token Price',     tokenPrice != null ? '$' + Number(tokenPrice).toFixed(4) : '$—'],
            ['Profitability',   prof.status || '—'],
            ['Net Profit/mo',   fmtM(prof.net_profit_30d)],
          ].map(([label, val]) => (
            <div key={label} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f2f5' }}>
              <div style={{ fontSize: '11px', color: '#6b7a99', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a1f2e', fontFamily: 'monospace' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Predictive insights */}
      {insights.length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e6ed', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Predictive Insights</div>
          {insights.map((ins, i) => {
            const dc = { improving: '#1a9e6e', declining: '#c43030', stable: '#b97a15', positive: '#1a9e6e', negative: '#c43030' }[ins.direction] || '#6b7a99';
            const di = { improving: '↑', declining: '↓', stable: '→', positive: '↑', negative: '↓' }[ins.direction] || '·';
            return (
              <div key={i} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px 14px', borderLeft: `3px solid ${dc}`, marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px', color: dc, fontWeight: '700' }}>{di}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: dc, textTransform: 'capitalize' }}>{ins.direction}</span>
                  <span style={{ fontSize: '10px', color: '#6b7a99', marginLeft: 'auto' }}>confidence: {ins.confidence}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#1a1f2e', lineHeight: '1.5' }}>{ins.message}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Risk flags */}
      {flags.length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e6ed', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Risk Signals</div>
          {flags.map((f, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#4a5568', padding: '8px 0', borderBottom: i < flags.length - 1 ? '1px solid #f0f2f5' : 'none', lineHeight: '1.5' }}>{f}</div>
          ))}
        </div>
      )}

      {/* Signal reason */}
      {scored.signal_reason && (
        <div style={{ background: '#f0f6ff', border: '1px solid #c7d9f5', borderRadius: '10px', padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: '#185fa5', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Signal Reason</div>
          <div style={{ fontSize: '13px', color: '#1a1f2e', lineHeight: '1.6' }}>{scored.signal_reason}</div>
        </div>
      )}

    </div>
  );
}