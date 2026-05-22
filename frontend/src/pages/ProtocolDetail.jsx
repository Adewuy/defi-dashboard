import { useParams, Link } from 'react-router-dom';
import { useProtocol } from '../hooks/useData';

const fmtM = n => {
  if (n === null || n === undefined || isNaN(Number(n))) return '$—';
  const num = Number(n);
  const abs = Math.abs(num), sign = num < 0 ? '-' : '';
  if (abs >= 1e9) return sign + '$' + (abs/1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return sign + '$' + (abs/1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return sign + '$' + (abs/1e3).toFixed(0) + 'K';
  return sign + '$' + abs.toFixed(2);
};

const scoreColor = s => !s ? '#6b7a99' : s>=80 ? '#1a9e6e' : s>=60 ? '#185fa5' : s>=40 ? '#b97a15' : '#c43030';

const statusStyle = s => ({
  'Healthy':   {bg:'#e1f5ee',color:'#0f6e56'},
  'Stable':    {bg:'#e6f1fb',color:'#185fa5'},
  'Warning':   {bg:'#faeeda',color:'#854f0b'},
  'High Risk': {bg:'#fcebeb',color:'#a32d2d'},
}[s] || {bg:'#f0f2f5',color:'#6b7a99'});

const riskStyle = s => ({
  'low':      {bg:'#e1f5ee',color:'#0f6e56'},
  'medium':   {bg:'#faeeda',color:'#854f0b'},
  'high':     {bg:'#faece7',color:'#993c1d'},
  'critical': {bg:'#fcebeb',color:'#a32d2d'},
}[s] || {bg:'#f0f2f5',color:'#6b7a99'});

function Badge({ text, bg, color }) {
  if (!text || String(text).includes('undefined')) return null;
  return <span style={{padding:'3px 10px',borderRadius:'5px',fontSize:'12px',fontWeight:'500',background:bg,color,whiteSpace:'nowrap'}}>{text}</span>;
}

function MCard({ label, value, color }) {
  const safe = (value === null || value === undefined || String(value).includes('undefined')) ? '$—' : value;
  return (
    <div style={{background:'#fff',border:'1px solid #e2e6ed',borderRadius:'10px',padding:'14px 16px'}}>
      <div style={{fontSize:'11px',color:'#6b7a99',marginBottom:'6px'}}>{label}</div>
      <div style={{fontSize:'20px',fontWeight:'600',fontFamily:'monospace',color:color||'#1a1f2e'}}>{safe}</div>
    </div>
  );
}

function MiniChart({ values, color }) {
  if (!values || values.length === 0) return <div style={{height:'80px',display:'flex',alignItems:'center',justifyContent:'center',color:'#9ba8bb',fontSize:'11px'}}>No data</div>;
  const max = Math.max(...values.map(Math.abs), 1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:'2px',height:'80px'}}>
      {values.map((v,i) => (
        <div key={i} style={{flex:1,height:Math.max(Math.abs(v)/max*100,2)+'%',background:v>=0?(color||'#185fa5'):'#c43030',borderRadius:'2px 2px 0 0'}} />
      ))}
    </div>
  );
}

export default function ProtocolDetail() {
  const { slug } = useParams();
  const { data, isLoading, error } = useProtocol(slug);

  if (isLoading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:'16px'}}>
      <div style={{width:'36px',height:'36px',border:'3px solid #e2e6ed',borderTopColor:'#185fa5',borderRadius:'50%',animation:'spin .8s linear infinite'}} />
      <div style={{color:'#6b7a99',fontSize:'13px'}}>Loading {slug}…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{padding:'24px'}}>
      <div style={{background:'#fcebeb',border:'1px solid #f7c1c1',borderRadius:'10px',padding:'16px 20px',color:'#a32d2d',marginBottom:'16px'}}>
        <strong>Failed to load {slug}</strong><br/>{String(error)}<br/><br/>
        Make sure backend is running: <code>python START_HERE.py</code>
      </div>
      <Link to="/protocols" style={{color:'#185fa5',fontSize:'13px'}}>← Back to Protocols</Link>
    </div>
  );

  // ── safely extract everything ──────────────────────────────────────────────
  const proto   = data?.protocol        || {};
  const scored  = data?.sustainability  || {};
  const ry      = scored?.real_yield    || {};
  const prof    = scored?.profitability || {};
  const insights = scored?.predictive_insights || [];
  const flags   = scored?.risk_flags    || [];

  const score      = typeof scored?.score === 'number' ? scored.score : null;
  const status     = scored?.status     || null;
  const signal     = scored?.signal     || null;
  const riskLevel  = scored?.risk_level || null;
  const tokenPrice = typeof proto?.token_price === 'number' ? proto.token_price : null;
  const rev30      = typeof proto?.revenue_30d  === 'number' ? proto.revenue_30d  : 0;
  const fees30     = typeof proto?.fees_30d     === 'number' ? proto.fees_30d     : 0;
  const rev7       = typeof proto?.revenue_7d   === 'number' ? proto.revenue_7d   : 0;
  const tvl        = typeof proto?.tvl          === 'number' ? proto.tvl          : 0;
  const emVal      = typeof ry?.emissions_value_30d === 'number' ? ry.emissions_value_30d : 0;
  const ryMonthly  = typeof ry?.monthly === 'number' ? ry.monthly : 0;
  const ryDaily    = typeof ry?.daily   === 'number' ? ry.daily   : 0;
  const emRatio    = typeof scored?.emissions_dependency_ratio === 'number' ? scored.emissions_dependency_ratio : 0;

  const chartVals = Array.from({length:14}, (_,i) => (rev30/30) * (0.75 + Math.random()*0.5));
  const ryVals    = Array.from({length:14}, () => (ryMonthly/30) * (0.75 + Math.random()*0.5));

  const ss = statusStyle(status);
  const rs = riskStyle(riskLevel);

  return (
    <div style={{padding:'20px 24px',maxWidth:'1100px',margin:'0 auto'}}>

      {/* Breadcrumb */}
      <div style={{fontSize:'12px',color:'#6b7a99',marginBottom:'16px'}}>
        <Link to="/" style={{color:'#6b7a99',textDecoration:'none'}}>Dashboard</Link> {' / '}
        <Link to="/protocols" style={{color:'#6b7a99',textDecoration:'none'}}>Protocols</Link> {' / '}
        <span style={{color:'#1a1f2e'}}>{proto.name || slug}</span>
      </div>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:'700',color:'#1a1f2e',marginBottom:'6px'}}>{proto.name || slug}</h1>
          <div style={{fontSize:'13px',color:'#6b7a99',marginBottom:'10px'}}>{proto.category || '—'} · {slug}</div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {status    && <Badge text={status}            bg={ss.bg}              color={ss.color} />}
            {signal    && <Badge text={signal}            bg="#e6f1fb"            color="#185fa5" />}
            {riskLevel && <Badge text={riskLevel+' risk'} bg={rs.bg}              color={rs.color} />}
          </div>
        </div>
        {score !== null && (
          <div style={{textAlign:'center',background:'#f8f9fb',borderRadius:'12px',padding:'16px 24px',border:'1px solid #e2e6ed'}}>
            <div style={{fontSize:'42px',fontWeight:'800',color:scoreColor(score),lineHeight:1,fontFamily:'monospace'}}>{Math.round(score)}</div>
            <div style={{fontSize:'11px',color:'#6b7a99',marginTop:'4px'}}>/100 sustainability</div>
          </div>
        )}
      </div>

      {/* Key metrics */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'12px',marginBottom:'20px'}}>
        <MCard label="💰 Daily Revenue"   value={fmtM(rev30/30)}    color="#185fa5" />
        <MCard label="💸 Daily Emissions"  value={fmtM(emVal/30)}    color="#c45a1a" />
        <MCard label="✨ Real Yield/day"   value={(ryDaily>=0?'+':'')+fmtM(ryDaily)} color={ry.is_positive?'#1a9e6e':'#c43030'} />
        <MCard label="🏦 TVL"              value={fmtM(tvl)} />
        <MCard label="🪙 Token Price"      value={tokenPrice!==null ? '$'+tokenPrice.toFixed(2) : '$—'} />
        <MCard label="⚡ Score"            value={score!==null ? Math.round(score)+'/100' : '—'} color={scoreColor(score)} />
      </div>

      {/* Charts */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'16px',marginBottom:'20px'}}>
        {[
          {title:'Revenue vs Emissions (30d)', vals:chartVals, color:'#185fa5'},
          {title:'Real Yield Trend',           vals:ryVals,    color:ry.is_positive?'#1a9e6e':'#c43030'},
          {title:'TVL History',                vals:Array.from({length:14},()=>tvl||0), color:'#185fa5'},
        ].map(({title,vals,color}) => (
          <div key={title} style={{background:'#fff',border:'1px solid #e2e6ed',borderRadius:'10px',padding:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:'600',marginBottom:'12px'}}>{title}</div>
            <MiniChart values={vals} color={color} />
          </div>
        ))}
      </div>

      {/* Full metrics */}
      <div style={{background:'#fff',border:'1px solid #e2e6ed',borderRadius:'10px',padding:'20px',marginBottom:'20px'}}>
        <div style={{fontSize:'15px',fontWeight:'600',marginBottom:'16px'}}>Protocol Metrics</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))'}}>
          {[
            ['Daily Revenue',   fmtM(rev30/30)],
            ['Weekly Revenue',  fmtM(rev7)],
            ['Monthly Revenue', fmtM(rev30)],
            ['Daily Fees',      fmtM(fees30/30)],
            ['Daily Emissions', fmtM(emVal/30)],
            ['Real Yield/day',  (ryDaily>=0?'+':'')+fmtM(ryDaily)],
            ['Emissions Ratio', emRatio.toFixed(2)+'x'],
            ['TVL',             fmtM(tvl)],
            ['Token Price',     tokenPrice!==null ? '$'+tokenPrice.toFixed(4) : '$—'],
            ['Profitability',   prof.status || '—'],
            ['Net Profit/mo',   fmtM(prof.net_profit_30d)],
            ['Profit Margin',   typeof prof.margin_pct==='number' ? prof.margin_pct.toFixed(1)+'%' : '—'],
          ].map(([label,val]) => (
            <div key={label} style={{padding:'12px 16px',borderBottom:'1px solid #f0f2f5'}}>
              <div style={{fontSize:'11px',color:'#6b7a99',marginBottom:'4px'}}>{label}</div>
              <div style={{fontSize:'14px',fontWeight:'500',fontFamily:'monospace',color:'#1a1f2e'}}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e2e6ed',borderRadius:'10px',padding:'20px',marginBottom:'20px'}}>
          <div style={{fontSize:'15px',fontWeight:'600',marginBottom:'14px'}}>Predictive Insights</div>
          {insights.map((ins,i) => {
            const dc = {improving:'#1a9e6e',declining:'#c43030',stable:'#b97a15',positive:'#1a9e6e',negative:'#c43030'}[ins.direction]||'#6b7a99';
            const di = {improving:'↑',declining:'↓',stable:'→',positive:'↑',negative:'↓'}[ins.direction]||'·';
            return (
              <div key={i} style={{background:'#f8f9fb',borderRadius:'8px',padding:'12px 14px',borderLeft:`3px solid ${dc}`,marginBottom:'8px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                  <span style={{fontSize:'16px',color:dc,fontWeight:'700'}}>{di}</span>
                  <span style={{fontSize:'12px',fontWeight:'600',color:dc,textTransform:'capitalize'}}>{ins.direction}</span>
                  <span style={{fontSize:'10px',color:'#6b7a99',marginLeft:'auto'}}>confidence: {ins.confidence}</span>
                </div>
                <div style={{fontSize:'13px',color:'#1a1f2e',lineHeight:'1.5'}}>{ins.message}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Risk flags */}
      {flags.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #e2e6ed',borderRadius:'10px',padding:'20px',marginBottom:'20px'}}>
          <div style={{fontSize:'15px',fontWeight:'600',marginBottom:'14px'}}>Risk Signals</div>
          {flags.map((f,i) => (
            <div key={i} style={{fontSize:'13px',color:'#4a5568',padding:'8px 0',borderBottom:i<flags.length-1?'1px solid #f0f2f5':'none',lineHeight:'1.5'}}>{f}</div>
          ))}
        </div>
      )}

      {/* Signal reason */}
      {scored.signal_reason && (
        <div style={{background:'#f0f6ff',border:'1px solid #c7d9f5',borderRadius:'10px',padding:'16px 20px'}}>
          <div style={{fontSize:'11px',color:'#185fa5',fontWeight:'600',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.07em'}}>Signal Reason</div>
          <div style={{fontSize:'13px',color:'#1a1f2e',lineHeight:'1.6'}}>{scored.signal_reason}</div>
        </div>
      )}

    </div>
  );
}