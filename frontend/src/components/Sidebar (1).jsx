import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/',          emoji: '📊', label: 'Dashboard'    },
  { to: '/protocols', emoji: '📋', label: 'All Protocols' },
  { to: '/compare',   emoji: '⚖️',  label: 'Compare'      },
  { to: '/alerts',    emoji: '🔔', label: 'Alerts'       },
  { to: '/settings',  emoji: '⚙️',  label: 'Settings'     },
];

export default function Sidebar() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); }, [location]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const active = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  if (isMobile) {
    return (
      <>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{
              position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300
            }}/>
            <div style={{
              position:'fixed',top:0,left:0,bottom:0,width:'240px',
              background:'#fff',zIndex:400,boxShadow:'4px 0 20px rgba(0,0,0,0.15)',
              display:'flex',flexDirection:'column'
            }}>
              <div style={{
                padding:'20px 16px',borderBottom:'1px solid #e2e6ed',
                display:'flex',alignItems:'center',justifyContent:'space-between'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{fontSize:'24px'}}>📈</span>
                  <div>
                    <div style={{fontSize:'14px',fontWeight:'700',color:'#1a1f2e'}}>DeFi Scan</div>
                    <div style={{fontSize:'10px',color:'#6b7a99'}}>Sustainability Analytics</div>
                  </div>
                </div>
                <button onClick={() => setMenuOpen(false)} style={{
                  background:'none',border:'none',fontSize:'22px',
                  cursor:'pointer',color:'#6b7a99'
                }}>✕</button>
              </div>
              <nav style={{padding:'12px',flex:1}}>
                {navItems.map(item => (
                  <NavLink key={item.to} to={item.to} end={item.to==='/'} onClick={() => setMenuOpen(false)}
                    style={{
                      display:'flex',alignItems:'center',gap:'12px',
                      padding:'12px 14px',borderRadius:'8px',textDecoration:'none',marginBottom:'4px',
                      background: active(item.to)?'#e6f0ff':'transparent',
                      color: active(item.to)?'#1a6de8':'#4a5568',
                      fontWeight: active(item.to)?'600':'400',fontSize:'15px'
                    }}>
                    <span style={{fontSize:'20px',width:'28px',textAlign:'center'}}>{item.emoji}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div style={{padding:'14px 16px',borderTop:'1px solid #e2e6ed',fontSize:'11px',color:'#6b7a99'}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px'}}>
                  <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#1a9e6e'}}></div>
                  <span style={{fontWeight:'500'}}>System Online</span>
                </div>
                <div style={{paddingLeft:'13px',display:'flex',flexDirection:'column',gap:'3px'}}>
                  <span>🦙 DeFiLlama: Active</span>
                  <span>🦎 CoinGecko: Active</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Bottom tab bar */}
        <div style={{
          position:'fixed',bottom:0,left:0,right:0,zIndex:200,
          background:'#ffffff',borderTop:'1px solid #e2e6ed',
          display:'flex',alignItems:'stretch',height:'62px'
        }}>
          {/* Hamburger menu button — NO ? sign, uses real lines */}
          <button onClick={() => setMenuOpen(true)} style={{
            flex:1,display:'flex',flexDirection:'column',alignItems:'center',
            justifyContent:'center',gap:'2px',background:'none',border:'none',
            cursor:'pointer',padding:'6px 0'
          }}>
            <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
              <div style={{width:'18px',height:'2px',background:'#6b7a99',borderRadius:'2px'}}></div>
              <div style={{width:'18px',height:'2px',background:'#6b7a99',borderRadius:'2px'}}></div>
              <div style={{width:'18px',height:'2px',background:'#6b7a99',borderRadius:'2px'}}></div>
            </div>
            <span style={{fontSize:'10px',color:'#6b7a99',marginTop:'2px'}}>Menu</span>
          </button>

          {/* 4 tab items */}
          {navItems.slice(0,4).map(item => (
            <NavLink key={item.to} to={item.to} end={item.to=='/'}
              style={{
                flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                justifyContent:'center',gap:'2px',textDecoration:'none',padding:'6px 0'
              }}>
              <span style={{fontSize:'20px',lineHeight:1}}>{item.emoji}</span>
              <span style={{
                fontSize:'10px',
                color: active(item.to)?'#1a6de8':'#6b7a99',
                fontWeight: active(item.to)?'600':'400'
              }}>
                {item.label==='All Protocols'?'Protocols':item.label}
              </span>
            </NavLink>
          ))}
        </div>
        <div style={{height:'62px'}}/>
      </>
    );
  }

  // Desktop
  return (
    <div style={{
      width:'220px',minHeight:'100vh',background:'#ffffff',
      borderRight:'1px solid #e2e6ed',display:'flex',flexDirection:'column',
      position:'sticky',top:0,height:'100vh',flexShrink:0
    }}>
      <div style={{padding:'20px 16px 12px',borderBottom:'1px solid #e2e6ed'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'28px'}}>📈</span>
          <div>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#1a1f2e'}}>DeFi Scan</div>
            <div style={{fontSize:'10px',color:'#6b7a99'}}>Sustainability Analytics</div>
          </div>
        </div>
      </div>
      <nav style={{padding:'12px',flex:1}}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to==='/'}
            style={{
              display:'flex',alignItems:'center',gap:'10px',
              padding:'10px 14px',borderRadius:'8px',textDecoration:'none',
              marginBottom:'4px',fontSize:'14px',
              background: active(item.to)?'#e6f0ff':'transparent',
              color: active(item.to)?'#1a6de8':'#4a5568',
              fontWeight: active(item.to)?'600':'400',transition:'all 0.15s'
            }}>
            <span style={{fontSize:'18px',width:'24px',textAlign:'center'}}>{item.emoji}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={{padding:'14px 16px',borderTop:'1px solid #e2e6ed',fontSize:'11px',color:'#6b7a99'}}>
        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px'}}>
          <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#1a9e6e'}}></div>
          <span style={{fontWeight:'500'}}>System Online</span>
        </div>
        <div style={{paddingLeft:'13px',display:'flex',flexDirection:'column',gap:'3px'}}>
          <span>🦙 DeFiLlama: Active</span>
          <span>🦎 CoinGecko: Active</span>
        </div>
      </div>
    </div>
  );
}
