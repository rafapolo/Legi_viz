'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { getAllParliamentarians, partyColor, type Parlamentar } from '@/lib/parliamentarians'
import {
  ArrowLeft, Sun, Moon, LogOut, Heart, Bell, Settings,
  User, Trash2, ChevronRight, TrendingUp, Vote, AlertTriangle, X,
} from 'lucide-react'
import { PARTY_COLORS } from '@/components/network-graph'

// ── Activity feed ─────────────────────────────────────────────
function getActivities(p: Parlamentar, seed: number) {
  const activities = [
    { icon:'vote', text:'Votou SIM — PL da Reforma Tributária',   time:'2h atrás',  tag:'Votação'  },
    { icon:'vote', text:'Votou NÃO — PEC da Previdência Social',  time:'5h atrás',  tag:'Votação'  },
    { icon:'news', text:'Mencionado(a) em 3 artigos de imprensa', time:'1d atrás',  tag:'Notícia'  },
    { icon:'patr', text:`Patrimônio: R$${(p.patrimonio/1000).toFixed(1)}M`,        time:'3d atrás',  tag:'TSE'      },
    { icon:'proc', text:'Nova movimentação processual no STF',    time:'5d atrás',  tag:'Jurídico' },
  ]
  return [activities[(seed*3+0)%activities.length], activities[(seed*3+1)%activities.length]]
}

function ActivityIcon({ type }: { type:string }) {
  const s = { width:32,height:32,borderRadius:10,background:'rgba(0,0,0,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 as const }
  if (type==='vote') return <div style={s}><Vote size={15}/></div>
  if (type==='news') return <div style={s}><Bell size={15}/></div>
  if (type==='patr') return <div style={s}><TrendingUp size={15}/></div>
  return <div style={s}><AlertTriangle size={15}/></div>
}

// ── Photo with real URL ───────────────────────────────────────
function ParPhoto({ p, size, isDark }: { p:Parlamentar; size:number; isDark:boolean }) {
  const [ok,  setOk]  = useState(false)
  const [err, setErr] = useState(false)
  const pColor  = PARTY_COLORS[p.partido] || partyColor(p.partido)
  const angle   = (p.idNumerico * 37) % 360
  const radius  = Math.round(size * 0.22)
  const initials = p.nomeUrna.split(' ').map(w=>w[0]).slice(0,2).join('')

  return (
    <div style={{ width:size,height:size,borderRadius:radius,flexShrink:0,
      background:`linear-gradient(${angle}deg,${pColor},${pColor}55)`,
      border:`2px solid ${isDark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.12)'}`,
      overflow:'hidden',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',
    }}>
      {!!p.urlFoto && !err && (
        <img src={p.urlFoto} alt={p.nomeUrna}
          onLoad={()=>setOk(true)} onError={()=>setErr(true)}
          style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',display:ok?'block':'none' }}
        />
      )}
      {!ok && (
        <span style={{ fontSize:size*0.32,fontWeight:800,fontFamily:'sans-serif',color:'rgba(255,255,255,0.95)' }}>
          {initials}
        </span>
      )}
    </div>
  )
}

// ── Activity modal ────────────────────────────────────────────
function ActivityModal({ act, isDark, onClose }: { act:{icon:string;text:string;time:string;tag:string}; isDark:boolean; onClose:()=>void }) {
  const bg  = isDark ? '#0D1826' : '#FFFFFF'
  const fg  = isDark ? '#EEF4FF' : '#0B1220'
  const sub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ background:bg,borderRadius:20,padding:28,maxWidth:380,width:'100%' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
          <span style={{ fontSize:11,fontFamily:'sans-serif',fontWeight:700,padding:'3px 9px',borderRadius:6,background:'rgba(59,130,246,0.12)',color:'#3B82F6' }}>{act.tag}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:sub }}><X size={16}/></button>
        </div>
        <p style={{ fontSize:16,fontFamily:'sans-serif',fontWeight:700,color:fg,lineHeight:1.5,marginBottom:12 }}>{act.text}</p>
        <p style={{ fontSize:12,fontFamily:'sans-serif',color:sub }}>{act.time}</p>
        <button onClick={onClose} style={{ marginTop:20,width:'100%',padding:'11px',borderRadius:12,background:'rgba(59,130,246,0.1)',border:'none',cursor:'pointer',fontSize:13,fontFamily:'sans-serif',fontWeight:700,color:'#3B82F6' }}>
          Fechar
        </button>
      </div>
    </div>
  )
}

// ── Notification panel ────────────────────────────────────────
function NotificationsPanel({ isDark, onClose }: { isDark:boolean; onClose:()=>void }) {
  const bg  = isDark ? '#0D1826' : '#FFFFFF'
  const fg  = isDark ? '#EEF4FF' : '#0B1220'
  const sub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const [enabled, setEnabled] = useState({ votacoes:true, noticias:false, juridico:true })

  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-start',justifyContent:'flex-end' }} onClick={onClose}>
      <div style={{ background:bg,width:300,minHeight:'100dvh',padding:'20px 20px 40px',boxShadow:'-8px 0 32px rgba(0,0,0,0.25)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,paddingTop:8 }}>
          <span style={{ fontSize:16,fontWeight:700,fontFamily:'sans-serif',color:fg }}>Notificações</span>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:sub }}><X size={18}/></button>
        </div>
        <p style={{ fontSize:12,fontFamily:'sans-serif',color:sub,marginBottom:20 }}>Escolha o que deseja receber:</p>
        {([
          {key:'votacoes', label:'Votações',   desc:'Quando parlamentar favorito votar'},
          {key:'noticias', label:'Notícias',   desc:'Novas manchetes sobre favoritos'},
          {key:'juridico', label:'Jurídico',   desc:'Movimentações processuais'},
        ] as const).map(item=>(
          <div key={item.key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0',borderBottom:`1px solid ${border}` }}>
            <div>
              <p style={{ fontSize:14,fontFamily:'sans-serif',fontWeight:600,color:fg,margin:0 }}>{item.label}</p>
              <p style={{ fontSize:11,fontFamily:'sans-serif',color:sub,margin:'2px 0 0' }}>{item.desc}</p>
            </div>
            <button
              onClick={()=>setEnabled(prev=>({...prev,[item.key]:!prev[item.key]}))}
              style={{ width:42,height:24,borderRadius:12,border:'none',cursor:'pointer',background:enabled[item.key]?'#22C55E':'rgba(0,0,0,0.15)',transition:'background 0.2s',position:'relative',flexShrink:0 }}>
              <div style={{ position:'absolute',top:3,width:18,height:18,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s',left:enabled[item.key]?21:3 }}/>
            </button>
          </div>
        ))}
        <div style={{ marginTop:20,padding:'12px 14px',borderRadius:12,background:'rgba(34,197,94,0.1)' }}>
          <p style={{ fontSize:12,fontFamily:'sans-serif',color:fg,margin:0 }}>
            {Object.values(enabled).filter(Boolean).length} tipo(s) de notificação ativo(s)
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Settings panel ────────────────────────────────────────────
function SettingsPanel({ isDark, onClose, onToggleTheme, onLogout }: {
  isDark:boolean; onClose:()=>void; onToggleTheme:()=>void; onLogout:()=>void
}) {
  const bg     = isDark ? '#0D1826' : '#FFFFFF'
  const fg     = isDark ? '#EEF4FF' : '#0B1220'
  const sub    = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'

  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-start',justifyContent:'flex-end' }} onClick={onClose}>
      <div style={{ background:bg,width:300,minHeight:'100dvh',padding:'20px 20px 40px',boxShadow:'-8px 0 32px rgba(0,0,0,0.25)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,paddingTop:8 }}>
          <span style={{ fontSize:16,fontWeight:700,fontFamily:'sans-serif',color:fg }}>Configurações</span>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:sub }}><X size={18}/></button>
        </div>
        {[
          { label:'Tema', desc:isDark?'Modo escuro':'Modo claro', action:onToggleTheme, extra:<span style={{ fontSize:11,fontFamily:'sans-serif',color:sub }}>{isDark?'🌙 Escuro':'☀️ Claro'}</span> },
          { label:'Exportar dados', desc:'Baixar seus parlamentares favoritos', action:()=>{}, extra:null },
          { label:'Limpar dados locais', desc:'Remove histórico e favoritos', action:()=>{ if(confirm('Apagar tudo?')){ localStorage.clear(); window.location.reload() } }, extra:null },
        ].map((item,i,arr)=>(
          <button key={item.label} onClick={item.action} style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0',background:'none',border:'none',borderBottom:i<arr.length-1?`1px solid ${border}`:'none',cursor:'pointer',textAlign:'left' as const }}>
            <div>
              <p style={{ fontSize:14,fontFamily:'sans-serif',fontWeight:600,color:fg,margin:0 }}>{item.label}</p>
              <p style={{ fontSize:11,fontFamily:'sans-serif',color:sub,margin:'2px 0 0' }}>{item.desc}</p>
            </div>
            {item.extra ?? <ChevronRight size={14} style={{ color:sub,flexShrink:0 }}/>}
          </button>
        ))}
        <button onClick={()=>{onClose();onLogout()}} style={{ marginTop:32,width:'100%',padding:'12px',borderRadius:12,background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer',fontSize:13,fontFamily:'sans-serif',fontWeight:700,color:'#EF4444',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
          <LogOut size={15}/> Sair da conta
        </button>
      </div>
    </div>
  )
}

// ── Saved card ────────────────────────────────────────────────
function SavedCard({ p, isDark, onRemove, onOpen }: {
  p:Parlamentar; isDark:boolean; onRemove:()=>void; onOpen:()=>void
}) {
  const seed       = parseInt(p.id.replace(/\D/g,''))||1
  const pColor     = PARTY_COLORS[p.partido] || partyColor(p.partido)
  const activities = getActivities(p, seed)
  const freq       = Math.round(p.frequencia*100)
  const [actModal, setActModal] = useState<typeof activities[0]|null>(null)
  const fg   = isDark ? '#EEF4FF' : '#0B1220'
  const sub  = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
  const card = isDark ? '#111C2E' : '#FFFFFF'
  const bord = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'

  return (
    <>
      <div style={{ borderRadius:20,overflow:'hidden',marginBottom:14,background:card,border:`1px solid ${bord}`,boxShadow:'0 2px 16px rgba(0,0,0,0.08)' }}>
        {/* Party stripe */}
        <div style={{ height:4,background:`linear-gradient(90deg,${pColor},${pColor}44)` }}/>

        {/* Header */}
        <div style={{ display:'flex',gap:13,alignItems:'center',padding:'13px 15px 10px' }}>
          <ParPhoto p={p} size={52} isDark={isDark}/>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ fontSize:15,fontWeight:800,fontFamily:'sans-serif',color:fg,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.nomeUrna}</p>
            <p style={{ fontSize:11,fontFamily:'sans-serif',color:sub,margin:'2px 0 0' }}>{p.tipo==='SENADOR'?'Senador(a)':'Dep. Federal'} · {p.partido} · {p.uf}</p>
          </div>
          <button onClick={onRemove} style={{ width:30,height:30,borderRadius:8,background:'transparent',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#EF4444',flexShrink:0 }}>
            <Trash2 size={13}/>
          </button>
        </div>

        {/* Stats strip */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1,background:bord,margin:'0 15px',borderRadius:10,overflow:'hidden',marginBottom:11 }}>
          {[{l:'Mandatos',v:`${p.mandatos}×`},{l:'Patrimônio',v:`R$${(p.patrimonio/1000).toFixed(0)}M`},{l:'Frequência',v:`${freq}%`},{l:'Processos',v:`${p.processos}`}].map(({l,v})=>(
            <div key={l} style={{ background:card,padding:'8px 4px',textAlign:'center' }}>
              <p style={{ fontSize:8,fontFamily:'sans-serif',fontWeight:700,color:sub,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:2 }}>{l}</p>
              <p style={{ fontSize:'clamp(11px,3vw,15px)',fontWeight:900,fontFamily:'monospace',color:fg,lineHeight:1 }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Activity — clickable */}
        <div style={{ padding:'0 15px 4px' }}>
          <p style={{ fontSize:9,fontFamily:'sans-serif',fontWeight:700,color:sub,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:7 }}>Atividade recente</p>
          {activities.map((act,i)=>(
            <button key={i} onClick={()=>setActModal(act)}
              style={{ width:'100%',display:'flex',alignItems:'flex-start',gap:9,paddingBottom:9,paddingTop:i>0?9:0,background:'none',border:'none',borderBottom:i<activities.length-1?`1px solid ${bord}`:'none',cursor:'pointer',textAlign:'left' as const,borderRadius:8 }}>
              <ActivityIcon type={act.icon}/>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:12,fontFamily:'sans-serif',color:fg,lineHeight:1.4,margin:0 }}>{act.text}</p>
                <div style={{ display:'flex',gap:7,marginTop:3,alignItems:'center' }}>
                  <span style={{ fontSize:9,fontFamily:'sans-serif',fontWeight:700,padding:'2px 6px',borderRadius:5,background:isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.06)',color:sub }}>{act.tag}</span>
                  <span style={{ fontSize:9,fontFamily:'sans-serif',color:sub }}>{act.time}</span>
                </div>
              </div>
              <ChevronRight size={12} style={{ color:sub,flexShrink:0,marginTop:4 }}/>
            </button>
          ))}
        </div>

        {/* Ver perfil */}
        <button onClick={onOpen}
          style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'11px 15px',background:'rgba(0,0,0,0.04)',border:'none',borderTop:`1px solid ${bord}`,cursor:'pointer',fontSize:12,fontFamily:'sans-serif',fontWeight:700,color:sub }}>
          Ver perfil completo <ChevronRight size={13}/>
        </button>
      </div>

      {actModal && <ActivityModal act={actModal} isDark={isDark} onClose={()=>setActModal(null)}/>}
    </>
  )
}

// ── PAGE ──────────────────────────────────────────────────────
export default function PerfilPage() {
  const router = useRouter()
  const [isDark,      setIsDark]      = useState(true)
  const [user,        setUser]        = useState<{name:string;email:string}|null>(null)
  const [saved,       setSaved]       = useState<Parlamentar[]>([])
  const [showNotifs,  setShowNotifs]  = useState(false)
  const [showSettings,setShowSettings] = useState(false)

  useEffect(()=>{
    const stored = localStorage.getItem('legi-viz-theme')
    const pref   = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark   = stored==='dark'||(!stored&&pref)
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
    const userData = localStorage.getItem('legi-viz-user')
    if (userData) setUser(JSON.parse(userData))
    else router.push('/login')
    const all  = getAllParliamentarians()
    const ids: string[] = []
    for (let i=0;i<localStorage.length;i++) {
      const k=localStorage.key(i)
      if (k?.startsWith('legi-viz-saved-')) ids.push(k.replace('legi-viz-saved-',''))
    }
    setSaved(all.filter(p=>ids.includes(p.id)))
  },[router])

  const toggleTheme = ()=>{
    const next=!isDark; setIsDark(next)
    localStorage.setItem('legi-viz-theme',next?'dark':'light')
    document.documentElement.classList.toggle('dark',next)
  }
  const handleLogout = ()=>{ localStorage.removeItem('legi-viz-user'); router.push('/') }
  const removeSaved  = useCallback((id:string)=>{ localStorage.removeItem(`legi-viz-saved-${id}`); setSaved(prev=>prev.filter(p=>p.id!==id)) },[])

  // Open parliamentarian profile on main page
  const openProfile = (p: Parlamentar) => {
    // Store selected so main page can open it
    sessionStorage.setItem('legi-viz-open-profile', p.id)
    router.push('/')
  }

  // Colours — neutral, theme-aware. No blue-dark background.
  const bg    = isDark ? '#0A0A0A' : '#F2F4F8'
  const fg    = isDark ? '#F0F0F0' : '#0B1220'
  const sub   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
  const hdr   = isDark ? 'rgba(10,10,10,0.92)' : 'rgba(242,244,248,0.92)'
  const hdrbr = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'

  if (!user) return (
    <div style={{ minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:bg,color:fg,fontFamily:'sans-serif' }}>Carregando...</div>
  )

  return (
    <div style={{ minHeight:'100dvh',background:bg,color:fg }}>
      {/* Header */}
      <header style={{ position:'sticky',top:0,zIndex:40,backdropFilter:'blur(16px)',background:hdr,borderBottom:`1px solid ${hdrbr}` }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 18px' }}>
          {/* Left: back */}
          <Link href="/" style={{ display:'flex',alignItems:'center',gap:5,color:sub,textDecoration:'none',fontSize:13,fontFamily:'sans-serif' }}>
            <ArrowLeft size={15}/>
            <span>Voltar</span>
          </Link>

          <Logo className="h-5" isDark={isDark}/>

          {/* Right: notif + settings */}
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            <button onClick={()=>setShowNotifs(true)} style={{ width:36,height:36,borderRadius:10,background:isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:fg }}>
              <Bell size={16}/>
            </button>
            <button onClick={()=>setShowSettings(true)} style={{ width:36,height:36,borderRadius:10,background:isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:fg }}>
              <Settings size={16}/>
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" style={{ maxWidth:540,margin:'0 auto',padding:'24px 16px 64px' }}>
        {/* User block — helvetica/sans, photo */}
        <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:28 }}>
          <div style={{ width:64,height:64,borderRadius:16,background:'#22C55E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:900,fontFamily:'sans-serif',color:'#fff',flexShrink:0 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize:22,fontWeight:900,fontFamily:'sans-serif',color:fg,margin:0 }}>{user.name}</h1>
            <p style={{ fontSize:12,fontFamily:'sans-serif',color:sub,margin:'3px 0 0' }}>{user.email}</p>
          </div>
        </div>

        {/* Favourites */}
        <section style={{ marginBottom:32 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
            <h2 style={{ fontSize:15,fontWeight:700,fontFamily:'sans-serif',color:fg,display:'flex',alignItems:'center',gap:7,margin:0 }}>
              <Heart size={15}/> Parlamentares favoritos
            </h2>
            <span style={{ fontSize:12,fontFamily:'sans-serif',color:sub }}>{saved.length}</span>
          </div>

          {saved.length===0?(
            <div style={{ padding:28,borderRadius:16,textAlign:'center',background:isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)',border:`1px solid ${isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'}` }}>
              <Heart size={30} style={{ marginBottom:11,opacity:0.25,color:fg }}/>
              <p style={{ fontSize:13,fontFamily:'sans-serif',color:sub,marginBottom:14 }}>Você ainda não tem parlamentares favoritos.</p>
              <Link href="/" style={{ display:'inline-block',padding:'10px 20px',background:'#22C55E',color:'#fff',borderRadius:10,fontSize:12,fontFamily:'sans-serif',fontWeight:700,textDecoration:'none' }}>
                Explorar parlamentares
              </Link>
            </div>
          ):(
            saved.map(p=>(
              <SavedCard key={p.id} p={p} isDark={isDark} onRemove={()=>removeSaved(p.id)} onOpen={()=>openProfile(p)}/>
            ))
          )}
        </section>

        {/* Logout */}
        <button onClick={handleLogout} style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:7,padding:13,borderRadius:13,background:'rgba(239,68,68,0.1)',border:'none',cursor:'pointer',fontSize:13,fontFamily:'sans-serif',fontWeight:700,color:'#EF4444' }}>
          <LogOut size={15}/> Sair da conta
        </button>

        <p style={{ textAlign:'center',fontSize:10,fontFamily:'sans-serif',color:sub,marginTop:20 }}>LEGI_VIZ v1.0 · Dados atualizados diariamente</p>
      </main>

      {showNotifs   && <NotificationsPanel isDark={isDark} onClose={()=>setShowNotifs(false)}/>}
      {showSettings && <SettingsPanel isDark={isDark} onClose={()=>setShowSettings(false)} onToggleTheme={toggleTheme} onLogout={handleLogout}/>}
    </div>
  )
}
