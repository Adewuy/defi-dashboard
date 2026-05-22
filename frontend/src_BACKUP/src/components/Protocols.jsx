import { useState, useEffect } from 'react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const fmtM = n => {
  if (!n && n !== 0) return 'N/A';
  const abs = Math.abs(n), sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(0) + 'K';
  return sign + '$' + abs.toFixed(0);
};

const scoreColor = s => s >= 80 ? '#1a9e6e' : s >= 60 ? '#185fa5' : s >= 40 ? '#b97a15' : '#c43030';
const scoreBg   = s => s >= 80 ? '#e1f5ee' : s >= 60 ? '#e6f1fb' : s >= 40 ? '#faeeda' : '#fcebeb';

const statusStyle = s => ({
  'Healthy':   { bg: '#e1f5ee', color: '#0f6e56' },
  'Stable':    { bg: '#e6f1fb', color: '#185fa5' },
  'Warning':   { bg: '#faeeda', color: '#854f0b' },
  'High Risk': { bg: '#fcebeb', color: '#a32d2d' },
}[s] || { bg: '#faeeda', color: '#854f0b' });

const profitStyle = s => ({
  'Profitable':   { bg: '#e1f5ee', color: '#0f6e56' },
  'Break-even':   { bg: '#faeeda', color: '#854f0b' },
  'Unprofitable': { bg: '#fcebeb', color: '#a32d2d' },
}[s] || { bg: '#faeeda', color: '#854f0b' });

function Badge({ text, style }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
      fontWeight: '500', background: style.bg, color: style.color,
      whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

function ScorePill({ score }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: scoreBg(score), borderRadius: '10px',
      padding: '6px 12px', minWidth: '52px',
    }}>
      <span style={{ fontSize: '20px', fontWeight: '700', color: scoreColor(score), lineHeight: 1 }}>
        {Math.round(score)}
      </span>
      <span style={{ fontSize: '9px', color: scoreColor(score), marginTop: '2px' }}>score</span>
    </div>
  );
}

// ── Mobile Card ───────────────────────────────────────────────────────────────
function ProtocolCard({ protocol, rank, onClick, expanded }) {
  const s = protocol._scored || {};
  const ry = s.realYield || {};
  const prof = s.profitability || {};
  const ss = statusStyle(s.status);
  const ps = profitStyle(prof.status);
  const ryColor = ry.isPositive ? '#1a9e6e' : '#c43030';

  return (
    <div onClick={() => onClick(protocol.slug)}
      style={{
        background: '#ffffff', borderRadius: '12px', marginBottom: '10px',
        border: `1px solid ${expanded ? scoreColor(s.score) : '#e2e6ed'}`,
        overflow: 'hidden', cursor: 'pointer',
        boxShadow: expanded ? `0 0 0 2px ${scoreColor(s.score)}22` : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.15s',
      }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}>
        <span style={{ fontSize: '12px', color: '#9ba8bb', fontWeight: '500', minWidth: '20px' }}>#{rank}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1f2e' }}>{protocol.name}</div>
          <div style={{ fontSize: '11px', color: '#6b7a99', marginTop: '1px' }}>{protocol.category}</div>
        </div>
        <ScorePill score={s.score || 0} />
        <span style={{ fontSize: '18px', color: '#9ba8bb', marginLeft: '4px' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Key metrics row — always visible */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderTop: '1px solid #f0f2f5', padding: '10px 14px', gap: '8px',
      }}>
        <div>
          <div style={{ fontSize: '9px', color: '#9ba8bb', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Revenue/day</div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#185fa5' }}>{fmtM(protocol.revenue_30d / 30)}</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: '#9ba8bb', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Real Yield/mo</div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: ryColor }}>{fmtM(ry.monthly)}</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: '#9ba8bb', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Em. Ratio</div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: (s.emissionsRatio || 0) > 1 ? '#c43030' : '#1a9e6e' }}>
            {(s.emissionsRatio || 0).toFixed(2)}x
          </div>
        </div>
      </div>

      {/* Status badges row — always visible */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 14px 12px', flexWrap: 'wrap' }}>
        <Badge text={s.status} style={ss} />
        <Badge text={prof.status} style={ps} />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f0f2f5', padding: '14px' }}>

          {/* Full metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {[
              ['TVL', fmtM(protocol.tvl)],
              ['Revenue 30d', fmtM(protocol.revenue_30d)],
              ['Emissions est.', fmtM(ry.emissionsValue)],
              ['Real Yield/day', fmtM(ry.daily)],
              ['Real Yield/week', fmtM(ry.weekly)],
              ['Profit Margin', (prof.margin || 0) + '%'],
            ].map(([label, val]) => (
              <div key={label} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '8px 10px' }}>
                <div style={{ fontSize: '9px', color: '#9ba8bb', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1f2e', fontFamily: 'monospace' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Signal */}
          {s.signalReason && (
            <div style={{ background: '#f0f6ff', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px',
              borderLeft: `3px solid ${scoreColor(s.score)}` }}>
              <div style={{ fontSize: '9px', color: '#9ba8bb', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signal</div>
              <div style={{ fontSize: '12px', color: '#1a1f2e', lineHeight: '1.5' }}>{s.signalReason}</div>
            </div>
          )}

          {/* Risk flags */}
          {s.flags && s.flags.length > 0 && (
            <div>
              <div style={{ fontSize: '9px', color: '#9ba8bb', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Risk Signals</div>
              {s.flags.map((f, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#4a5568', padding: '4px 0',
                  borderBottom: '1px solid #f0f2f5', lineHeight: '1.5' }}>{f}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Desktop Table Row ─────────────────────────────────────────────────────────
function TableRow({ protocol, rank, onClick, selected }) {
  const s = protocol._scored || {};
  const ry = s.realYield || {};
  const prof = s.profitability || {};
  const ryColor = ry.isPositive ? '#1a9e6e' : '#c43030';
  const emC = (s.emissionsRatio || 0) < 0.5 ? '#1a9e6e' : (s.emissionsRatio || 0) < 1.0 ? '#b97a15' : '#c43030';

  return (
    <tr onClick={() => onClick(protocol.slug)}
      style={{ borderBottom: '1px solid #f0f2f5', cursor: 'pointer',
        background: selected ? '#f0f6ff' : 'transparent', transition: 'background 0.1s' }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f8f9fb'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}>
      <td style={{ padding: '10px 12px', fontSize: '11px', color: '#9ba8bb' }}>#{rank}</td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: '600', fontSize: '13px' }}>{protocol.name}</div>
        <div style={{ fontSize: '10px', color: '#6b7a99' }}>{protocol.category}</div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <Badge text={s.status} style={statusStyle(s.status)} />
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
        <div style={{ fontWeight: '700', color: scoreColor(s.score), fontFamily: 'monospace', fontSize: '14px' }}>
          {s.score}
        </div>
        <div style={{ height: '3px', background: '#f0f2f5', borderRadius: '3px', marginTop: '3px', width: '60px', marginLeft: 'auto' }}>
          <div style={{ width: `${s.score}%`, height: '100%', background: scoreColor(s.score), borderRadius: '3px' }} />
        </div>
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: '#185fa5' }}>
        {fmtM(protocol.revenue_30d)}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: '#c45a1a' }}>
        {fmtM(ry.emissionsValue)}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '600', color: ryColor }}>
        {fmtM(ry.monthly)}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: emC }}>
        {(s.emissionsRatio || 0).toFixed(2)}x
      </td>
      <td style={{ padding: '10px 12px' }}>
        <Badge text={prof.status} style={profitStyle(prof.status)} />
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Protocols({ protocols = [] }) {
  const isMobile = useIsMobile();
  const [expandedSlug, setExpandedSlug] = useState(null);
  const [sortBy, setSortBy] = useState('score');
  const [filterCat, setFilterCat] = useState('All Categories');

  const categories = ['All Categories', ...new Set(protocols.map(p => p.category).filter(Boolean))];

  const sorted = [...protocols]
    .filter(p => filterCat === 'All Categories' || p.category === filterCat)
    .sort((a, b) => {
      const as = a._scored || {}, bs = b._scored || {};
      if (sortBy === 'score')    return (bs.score || 0) - (as.score || 0);
      if (sortBy === 'revenue')  return (b.revenue_30d || 0) - (a.revenue_30d || 0);
      if (sortBy === 'tvl')      return (b.tvl || 0) - (a.tvl || 0);
      if (sortBy === 'realyield') return ((bs.realYield || {}).monthly || 0) - ((as.realYield || {}).monthly || 0);
      return 0;
    });

  const handleClick = slug => setExpandedSlug(prev => prev === slug ? null : slug);

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '700', color: '#1a1f2e', marginBottom: '4px' }}>
          All Protocols
        </h1>
        <p style={{ fontSize: '12px', color: '#6b7a99' }}>
          {sorted.length} protocols · updated {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #e2e6ed',
            fontSize: '12px', background: '#fff', color: '#1a1f2e', cursor: 'pointer' }}>
          <option value="score">↓ Sustainability Score</option>
          <option value="revenue">↓ Revenue</option>
          <option value="tvl">↓ TVL</option>
          <option value="realyield">↓ Real Yield</option>
        </select>

        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #e2e6ed',
            fontSize: '12px', background: '#fff', color: '#1a1f2e', cursor: 'pointer' }}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* ── MOBILE: Card layout ── */}
      {isMobile && (
        <div>
          {sorted.map((p, i) => (
            <ProtocolCard
              key={p.slug}
              protocol={p}
              rank={i + 1}
              onClick={handleClick}
              expanded={expandedSlug === p.slug}
            />
          ))}
        </div>
      )}

      {/* ── DESKTOP: Table layout ── */}
      {!isMobile && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e6ed', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e6ed', background: '#f8f9fb' }}>
                {['#', 'Protocol', 'Status', 'Score', 'Revenue 30d', 'Emissions', 'Real Yield/Mo', 'Em. Ratio', 'Profitability'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: '10px', color: '#6b7a99',
                    fontWeight: '500', letterSpacing: '0.08em', textAlign: h === '#' || h === 'Protocol' ? 'left' : 'right',
                    whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <TableRow
                  key={p.slug}
                  protocol={p}
                  rank={i + 1}
                  onClick={handleClick}
                  selected={expandedSlug === p.slug}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
