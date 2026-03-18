'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { getAllParliamentarians, type Parlamentar } from '@/lib/parliamentarians'
import {
  ArrowLeft, Bell, Settings, X, LogOut, LayoutGrid, List, SortAsc,
  ChevronDown, Plus, ExternalLink, Folder, Heart, Check,
  Bookmark, Star, Flag, Zap, Eye, Target, Users, Vote,
  AlertTriangle, TrendingUp, ChevronRight,
} from 'lucide-react'
import { PARTY_COLORS } from '@/components/network-graph'

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const ICON_OPTIONS = [
  { id: 'folder',   Icon: Folder   },
  { id: 'star',     Icon: Star     },
  { id: 'flag',     Icon: Flag     },
  { id: 'zap',      Icon: Zap      },
  { id: 'eye',      Icon: Eye      },
  { id: 'target',   Icon: Target   },
  { id: 'users',    Icon: Users    },
  { id: 'bookmark', Icon: Bookmark },
  { id: 'heart',    Icon: Heart    },
]

const COLOR_OPTIONS = [
  '#22C55E','#3B82F6','#F97316','#A855F7',
  '#EF4444','#FACC15','#14B8A6','#EC4899',
  '#06B6D4','#84CC16','#F43F5E','#8B5CF6',
]

interface Collection { id:string; name:string; color:string; icon:string; ids:string[] }
type SortKey = 'nome'|'partido'|'patrimonio'|'mandatos'|'frequencia'

function ColIcon({ iconId, color, size=14 }: { iconId:string; color:string; size?:number }) {
  const opt = ICON_OPTIONS.find(i=>i.id===iconId) ?? ICON_OPTIONS[0]
  return <opt.Icon size={size} color={color} strokeWidth={2.5}/>
}

function getActivities(p: Parlamentar, seed: number) {
  const isSenador = p.tipo === 'SENADOR'
  const baseUrl   = isSenador
    ? `https://www.senado.leg.br/senadores/senador/${p.idNumerico}/`
    : `https://www.camara.leg.br/deputados/${p.idNumerico}`
  const FEED = [
    { icon:'vote', text:'Votou SIM — Reforma Tributária (IVA Dual)',  time:'2h',  tag:'Votação',  url:`https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2384527` },
    { icon:'vote', text:'Votou NÃO — PEC da Previdência Social',      time:'5h',  tag:'Votação',  url:`https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2192459` },
    { icon:'news', text:'Mencionado(a) em 3 artigos de imprensa',     time:'1d',  tag:'Notícia',  url:`https://news.google.com/search?q=${encodeURIComponent(p.nomeUrna)}` },
    { icon:'patr', text:`Patrimônio declarado R$${(p.patrimonio/1e6).toFixed(1)}M`, time:'3d', tag:'TSE', url:baseUrl },
    { icon:'proc', text:'Movimentação processual registrada no STF',  time:'5d',  tag:'Jurídico', url:`https://portal.stf.jus.br/` },
    { icon:'vote', text:'Votou SIM — PL da Anistia (8/1)',            time:'1sem',tag:'Votação',  url:`https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2387004` },
  ]
  const i0=(seed*3)%FEED.length, i1=(seed*3+1)%FEED.length, i2=(seed*3+2)%FEED.length
  return [FEED[i0],FEED[i1],FEED[i2]]
}

function TagColor(tag: string) {
  const m: Record<string,string> = { Votação:'#3B82F6', Notícia:'#22C55E', TSE:'#F97316', Jurídico:'#EF4444' }
  return m[tag] || '#64748B'
}

function ActivityIcon({ type, isDark }: { type:string; isDark:boolean }) {
  const s = { width:30,height:30,borderRadius:8, background:isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)',
    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 as const }
  const c = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'
  if (type==='vote') return <div style={s}><Vote size={13} color={c}/></div>
  if (type==='news') return <div style={s}><Bell size={13} color={c}/></div>
  if (type==='patr') return <div style={s}><TrendingUp size={13} color={c}/></div>
  return <div style={s}><AlertTriangle size={13} color={c}/></div>
}

function ParPhoto({ p, size, isDark }: { p:Parlamentar; size:number; isDark:boolean }) {
  const [ok,setOk]=useState(false),[err,setErr]=useState(false)
  const pColor=PARTY_COLORS[p.partido]||'#64748B'
  const initials=p.nomeUrna.split(' ').map((w:string)=>w[0]).slice(0,2).join('')
  return (
    <div style={{ width:size,height:size,borderRadius:Math.round(size*0.22),flexShrink:0,
      background:`linear-gradient(135deg,${pColor},${pColor}55)`,
      border:`2px solid ${isDark?'rgba(255,255,255,0.09)':'rgba(0,0,0,0.09)'}`,
      overflow:'hidden',position:'relative',display:'flex',alignItems:'center',justifyContent:'center' }}>
      {!!p.urlFoto&&!err&&<img src={p.urlFoto} alt={p.nomeUrna} onLoad={()=>setOk(true)} onError={()=>setErr(true)} style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',display:ok?'block':'none' }}/>}
      {!ok&&<span style={{ fontSize:size*0.32,fontWeight:800,color:'rgba(255,255,255,0.95)',fontFamily:FONT }}>{initials}</span>}
    </div>
  )
}

function ActivityModal({ act, p, isDark, onClose }: {
  act:{icon:string;text:string;time:string;tag:string;url:string}; p:Parlamentar; isDark:boolean; onClose:()=>void
}) {
  const bg=isDark?'#111':'#FFF',fg=isDark?'#F0F0F0':'#0B1220',sub=isDark?'rgba(255,255,255,0.42)':'rgba(0,0,0,0.42)'
  const brd=isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)', tc=TagColor(act.tag)
  const router=useRouter()
  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ background:bg,borderRadius:20,padding:28,maxWidth:400,width:'100%',boxShadow:'0 24px 64px rgba(0,0,0,0.4)',border:`1px solid ${brd}` }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <ActivityIcon type={act.icon} isDark={isDark}/>
            <span style={{ fontSize:9,fontWeight:700,fontFamily:FONT,padding:'2px 7px',borderRadius:4,background:`${tc}18`,color:tc,textTransform:'uppercase' as const,letterSpacing:'0.06em' }}>{act.tag}</span>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:sub,padding:4,display:'flex' }}><X size={15}/></button>
        </div>
        <p style={{ fontSize:16,fontWeight:800,fontFamily:FONT,color:fg,lineHeight:1.5,margin:'0 0 5px' }}>{act.text}</p>
        <p style={{ fontSize:11,fontFamily:FONT,color:sub,margin:'0 0 22px' }}>{act.time} · {p.nomeUrna}</p>
        <a href={act.url} target="_blank" rel="noopener noreferrer"
          style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:7,width:'100%',padding:'12px',borderRadius:10,background:fg,color:bg,fontSize:12,fontWeight:700,fontFamily:FONT,textDecoration:'none',boxSizing:'border-box' as const }}>
          Ver fonte oficial<ExternalLink size={12}/>
        </a>
        <button onClick={()=>{ sessionStorage.setItem('legi-viz-open-profile',p.id); onClose(); router.push('/') }}
          style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:8,width:'100%',padding:'10px',borderRadius:10,background:isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.06)',color:fg,fontSize:12,fontWeight:700,fontFamily:FONT,border:'none',cursor:'pointer',boxSizing:'border-box' as const }}>
          Ver perfil<ChevronRight size={13}/>
        </button>
        <button onClick={onClose} style={{ marginTop:6,width:'100%',padding:'8px',borderRadius:10,background:'transparent',border:'none',cursor:'pointer',fontSize:11,fontFamily:FONT,fontWeight:700,color:sub }}>
          Fechar
        </button>
      </div>
    </div>
  )
}

function NewCollectionModal({ isDark, onClose, onCreate }: { isDark:boolean; onClose:()=>void; onCreate:(n:string,c:string,i:string)=>void }) {
  const [name,setName]=useState(''),[color,setColor]=useState(COLOR_OPTIONS[0]),[icon,setIcon]=useState(ICON_OPTIONS[0].id)
  const bg=isDark?'#111':'#FFF',fg=isDark?'#F0F0F0':'#0B1220',sub=isDark?'rgba(255,255,255,0.42)':'rgba(0,0,0,0.42)',brd=isDark?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.10)'
  const submit=()=>{ if(!name.trim()) return; onCreate(name.trim(),color,icon); onClose() }
  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ background:bg,borderRadius:20,padding:28,maxWidth:380,width:'100%',boxShadow:'0 24px 64px rgba(0,0,0,0.4)',border:`1px solid ${brd}` }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <p style={{ fontSize:15,fontWeight:900,fontFamily:FONT,color:fg,margin:0 }}>Nova coleção</p>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:sub }}><X size={16}/></button>
        </div>
        {/* Preview */}
        <div style={{ display:'flex',alignItems:'center',gap:12,padding:12,borderRadius:12,background:isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)',marginBottom:18,border:`1px solid ${brd}` }}>
          <div style={{ width:38,height:38,borderRadius:9,background:`${color}18`,border:`1.5px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <ColIcon iconId={icon} color={color} size={17}/>
          </div>
          <p style={{ fontSize:13,fontWeight:700,fontFamily:FONT,color:name?fg:sub,margin:0 }}>{name||'Nome da coleção'}</p>
        </div>
        <p style={{ fontSize:9,fontFamily:FONT,fontWeight:700,color:sub,textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 6px' }}>Nome</p>
        <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} autoFocus placeholder="Ex: Acompanhamento especial" style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:`1.5px solid ${brd}`,background:'transparent',color:fg,fontFamily:FONT,fontSize:13,outline:'none',boxSizing:'border-box' as const,marginBottom:14 }}/>
        <p style={{ fontSize:9,fontFamily:FONT,fontWeight:700,color:sub,textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 7px' }}>Cor</p>
        <div style={{ display:'flex',flexWrap:'wrap',gap:7,marginBottom:14 }}>
          {COLOR_OPTIONS.map(c=>(
            <button key={c} onClick={()=>setColor(c)} style={{ width:26,height:26,borderRadius:7,background:c,border:`3px solid ${color===c?fg:'transparent'}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box' as const }}>
              {color===c&&<Check size={11} color="#fff" strokeWidth={3}/>}
            </button>
          ))}
        </div>
        <p style={{ fontSize:9,fontFamily:FONT,fontWeight:700,color:sub,textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 7px' }}>Ícone</p>
        <div style={{ display:'flex',flexWrap:'wrap',gap:7,marginBottom:20 }}>
          {ICON_OPTIONS.map(opt=>(
            <button key={opt.id} onClick={()=>setIcon(opt.id)} style={{ width:34,height:34,borderRadius:9,border:`1.5px solid ${icon===opt.id?color:brd}`,background:icon===opt.id?`${color}18`:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <opt.Icon size={15} color={icon===opt.id?color:(isDark?'rgba(255,255,255,0.4)':'rgba(0,0,0,0.35)')} strokeWidth={2}/>
            </button>
          ))}
        </div>
        <button onClick={submit} style={{ width:'100%',padding:'12px',borderRadius:10,background:fg,color:bg,fontSize:13,fontWeight:700,fontFamily:FONT,border:'none',cursor:'pointer' }}>Criar coleção</button>
      </div>
    </div>
  )
}

function GridCard({ p, isDark, onRemove, onOpen, collections, onToggleMember }: {
  p:Parlamentar; isDark:boolean; onRemove:()=>void; onOpen:()=>void; collections:Collection[]; onToggleMember:(cId:string,pId:string)=>void
}) {
  const seed=parseInt(p.id.replace(/\D/g,''))||1
  const pColor=PARTY_COLORS[p.partido]||'#64748B'
  const freq=Math.round(p.frequencia*100)
  const acts=getActivities(p,seed)
  const fg=isDark?'#F0F0F0':'#0B1220',sub=isDark?'rgba(255,255,255,0.42)':'rgba(0,0,0,0.42)'
  const card=isDark?'#111':'#FFF',brd=isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)'
  const myCol=collections.filter(c=>c.ids.includes(p.id))
  const [actModal,setActModal]=useState<typeof acts[0]|null>(null)
  const [showPicker,setShowPicker]=useState(false)
  return (
    <>
      <div style={{ borderRadius:16,overflow:'hidden',background:card,border:`1px solid ${brd}`,display:'flex',flexDirection:'column',position:'relative' }}>
        <div style={{ height:3,background:`linear-gradient(90deg,${pColor},${pColor}44)` }}/>
        <div style={{ display:'flex',gap:10,alignItems:'center',padding:'13px 13px 9px' }}>
          <ParPhoto p={p} size={42} isDark={isDark}/>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ fontSize:12,fontWeight:800,fontFamily:FONT,color:fg,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.nomeUrna}</p>
            <p style={{ fontSize:9,fontFamily:FONT,color:sub,margin:'2px 0 0' }}>{p.tipo==='SENADOR'?'Sen.':'Dep.'} · {p.partido} · {p.uf}</p>
          </div>
          <button onClick={onRemove} style={{ width:24,height:24,background:'transparent',border:'none',cursor:'pointer',color:'#EF4444',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',padding:0 }}><X size={11}/></button>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,background:brd,margin:'0 13px 10px',borderRadius:8,overflow:'hidden' }}>
          {[{l:'Mand.',v:`${p.mandatos}×`},{l:'Freq.',v:`${freq}%`},{l:'Proc.',v:`${p.processos}`}].map(({l,v})=>(
            <div key={l} style={{ background:card,padding:'6px 4px',textAlign:'center' as const }}>
              <p style={{ fontSize:7,fontFamily:FONT,fontWeight:700,color:sub,textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 1px' }}>{l}</p>
              <p style={{ fontSize:13,fontWeight:900,fontFamily:FONT,color:fg,margin:0,lineHeight:1 }}>{v}</p>
            </div>
          ))}
        </div>
        {myCol.length>0&&<div style={{ display:'flex',flexWrap:'wrap',gap:3,padding:'0 13px',marginBottom:8 }}>
          {myCol.map(c=><span key={c.id} style={{ display:'inline-flex',alignItems:'center',gap:3,fontSize:8,fontWeight:700,fontFamily:FONT,padding:'2px 6px',borderRadius:4,background:`${c.color}18`,color:c.color }}><ColIcon iconId={c.icon} color={c.color} size={8}/>{c.name}</span>)}
        </div>}
        <div style={{ padding:'6px 13px 0',borderTop:`1px solid ${brd}` }}>
          <p style={{ fontSize:7,fontFamily:FONT,fontWeight:700,color:sub,textTransform:'uppercase' as const,letterSpacing:'0.07em',margin:'0 0 6px' }}>Atividade recente</p>
          {acts.slice(0,2).map((act,i)=>(
            <button key={i} onClick={()=>setActModal(act)} style={{ width:'100%',display:'flex',alignItems:'flex-start',gap:7,padding:'0 0 7px',background:'none',border:'none',cursor:'pointer',textAlign:'left' as const }}>
              <ActivityIcon type={act.icon} isDark={isDark}/>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:10,fontFamily:FONT,color:fg,lineHeight:1.35,margin:'0 0 2px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any,overflow:'hidden' }}>{act.text}</p>
                <div style={{ display:'flex',gap:5,alignItems:'center' }}>
                  <span style={{ fontSize:7,fontFamily:FONT,fontWeight:700,padding:'1px 4px',borderRadius:3,background:`${TagColor(act.tag)}18`,color:TagColor(act.tag) }}>{act.tag}</span>
                  <span style={{ fontSize:7,fontFamily:FONT,color:sub }}>{act.time}</span>
                </div>
              </div>
              <ChevronRight size={10} style={{ color:sub,flexShrink:0,marginTop:2 }}/>
            </button>
          ))}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',borderTop:`1px solid ${brd}`,marginTop:'auto' }}>
          <button onClick={()=>setShowPicker(s=>!s)} style={{ padding:'9px 6px',background:'transparent',border:'none',borderRight:`1px solid ${brd}`,cursor:'pointer',fontSize:9,fontFamily:FONT,fontWeight:700,color:sub,display:'flex',alignItems:'center',justifyContent:'center',gap:3 }}>
            <Folder size={10}/>Coleção
          </button>
          <button onClick={onOpen} style={{ padding:'9px 6px',background:'transparent',border:'none',cursor:'pointer',fontSize:9,fontFamily:FONT,fontWeight:700,color:fg,display:'flex',alignItems:'center',justifyContent:'center',gap:3 }}>
            Ver perfil<ChevronRight size={10}/>
          </button>
        </div>
        {showPicker&&collections.length>0&&<>
          <div style={{ position:'fixed',inset:0,zIndex:19 }} onClick={()=>setShowPicker(false)}/>
          <div style={{ position:'absolute',bottom:38,left:0,right:0,zIndex:20,background:card,border:`1px solid ${brd}`,borderRadius:12,margin:'0 8px',padding:8,boxShadow:'0 8px 24px rgba(0,0,0,0.2)' }}>
            {collections.map(c=><button key={c.id} onClick={()=>{onToggleMember(c.id,p.id);setShowPicker(false)}} style={{ width:'100%',display:'flex',alignItems:'center',gap:7,padding:'7px 8px',background:c.ids.includes(p.id)?`${c.color}10`:'transparent',border:'none',cursor:'pointer',borderRadius:7 }}>
              <ColIcon iconId={c.icon} color={c.color} size={12}/>
              <span style={{ fontSize:11,fontFamily:FONT,color:fg,flex:1,textAlign:'left' as const }}>{c.name}</span>
              {c.ids.includes(p.id)&&<Check size={10} color={c.color} strokeWidth={3}/>}
            </button>)}
          </div>
        </>}
      </div>
      {actModal&&<ActivityModal act={actModal} p={p} isDark={isDark} onClose={()=>setActModal(null)}/>}
    </>
  )
}

function ListCard({ p, isDark, onRemove, onOpen, collections, onToggleMember }: {
  p:Parlamentar; isDark:boolean; onRemove:()=>void; onOpen:()=>void; collections:Collection[]; onToggleMember:(cId:string,pId:string)=>void
}) {
  const seed=parseInt(p.id.replace(/\D/g,''))||1
  const pColor=PARTY_COLORS[p.partido]||'#64748B'
  const freq=Math.round(p.frequencia*100)
  const acts=getActivities(p,seed)
  const fg=isDark?'#F0F0F0':'#0B1220',sub=isDark?'rgba(255,255,255,0.42)':'rgba(0,0,0,0.42)'
  const card=isDark?'#111':'#FFF',brd=isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)'
  const myCol=collections.filter(c=>c.ids.includes(p.id))
  const [expanded,setExpanded]=useState(false)
  const [actModal,setActModal]=useState<typeof acts[0]|null>(null)
  return (
    <>
      <div style={{ borderRadius:14,overflow:'hidden',background:card,border:`1px solid ${brd}` }}>
        <div style={{ height:2,background:`linear-gradient(90deg,${pColor},${pColor}33)` }}/>
        <div style={{ display:'flex',alignItems:'center',gap:11,padding:'11px 14px' }}>
          <ParPhoto p={p} size={38} isDark={isDark}/>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ fontSize:13,fontWeight:800,fontFamily:FONT,color:fg,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.nomeUrna}</p>
            <p style={{ fontSize:9,fontFamily:FONT,color:sub,margin:'1px 0 0' }}>{p.tipo==='SENADOR'?'Senador(a)':'Dep. Federal'} · {p.partido} · {p.uf}</p>
          </div>
          <div style={{ display:'flex',gap:10,flexShrink:0 }}>
            {[{l:'Mand.',v:`${p.mandatos}×`},{l:'Freq.',v:`${freq}%`}].map(({l,v})=>(
              <div key={l} style={{ textAlign:'center' as const }}>
                <p style={{ fontSize:7,fontFamily:FONT,fontWeight:700,color:sub,textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 1px' }}>{l}</p>
                <p style={{ fontSize:12,fontWeight:900,fontFamily:FONT,color:fg,margin:0,lineHeight:1 }}>{v}</p>
              </div>
            ))}
          </div>
          {myCol.length>0&&<div style={{ display:'flex',gap:3 }}>{myCol.slice(0,2).map(c=><span key={c.id} style={{ display:'inline-flex',alignItems:'center',padding:'2px 4px',borderRadius:3,background:`${c.color}18`}}><ColIcon iconId={c.icon} color={c.color} size={8}/></span>)}</div>}
          <button onClick={()=>setExpanded(e=>!e)} style={{ width:27,height:27,background:isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)',border:'none',borderRadius:7,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:sub,flexShrink:0,transition:'transform 0.18s',transform:expanded?'rotate(90deg)':'none' }}><ChevronRight size={12}/></button>
          <button onClick={onRemove} style={{ width:27,height:27,background:'transparent',border:'none',cursor:'pointer',color:'#EF4444',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',padding:0 }}><X size={11}/></button>
        </div>
        {expanded&&<div style={{ borderTop:`1px solid ${brd}`,padding:'12px 14px' }}>
          <p style={{ fontSize:7,fontFamily:FONT,fontWeight:700,color:sub,textTransform:'uppercase' as const,letterSpacing:'0.07em',margin:'0 0 8px' }}>Atividade recente</p>
          {acts.map((act,i)=>(
            <button key={i} onClick={()=>setActModal(act)} style={{ width:'100%',display:'flex',alignItems:'flex-start',gap:9,padding:'0 0 8px',background:'none',border:'none',cursor:'pointer',textAlign:'left' as const }}>
              <ActivityIcon type={act.icon} isDark={isDark}/>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:12,fontFamily:FONT,color:fg,lineHeight:1.4,margin:'0 0 2px' }}>{act.text}</p>
                <div style={{ display:'flex',gap:5,alignItems:'center' }}>
                  <span style={{ fontSize:8,fontFamily:FONT,fontWeight:700,padding:'1px 5px',borderRadius:3,background:`${TagColor(act.tag)}18`,color:TagColor(act.tag) }}>{act.tag}</span>
                  <span style={{ fontSize:8,fontFamily:FONT,color:sub }}>{act.time}</span>
                </div>
              </div>
              <ExternalLink size={9} style={{ color:sub,flexShrink:0,marginTop:3 }}/>
            </button>
          ))}
          <button onClick={onOpen} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:5,width:'100%',padding:'9px',borderRadius:9,background:isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)',border:'none',cursor:'pointer',fontSize:11,fontFamily:FONT,fontWeight:700,color:fg }}>
            Ver perfil completo<ChevronRight size={12}/>
          </button>
        </div>}
      </div>
      {actModal&&<ActivityModal act={actModal} p={p} isDark={isDark} onClose={()=>setActModal(null)}/>}
    </>
  )
}

function useCollections() {
  const [cols,setCols]=useState<Collection[]>([])
  useEffect(()=>{ try{const d=localStorage.getItem('legi-viz-collections');if(d)setCols(JSON.parse(d))}catch{} },[])
  const persist=(next:Collection[])=>{ setCols(next); localStorage.setItem('legi-viz-collections',JSON.stringify(next)) }
  const add=(name:string,color:string,icon:string)=>persist([...cols,{id:Date.now().toString(),name,color,icon,ids:[]}])
  const remove=(id:string)=>persist(cols.filter(c=>c.id!==id))
  const toggle=(colId:string,pId:string)=>persist(cols.map(c=>c.id===colId?{...c,ids:c.ids.includes(pId)?c.ids.filter((x:string)=>x!==pId):[...c.ids,pId]}:c))
  return {cols,add,remove,toggle}
}

export default function PerfilPage() {
  const router=useRouter()
  const [isDark,setIsDark]=useState(true)
  const [user,setUser]=useState<{name:string;email:string}|null>(null)
  const [saved,setSaved]=useState<Parlamentar[]>([])
  const [viewMode,setViewMode]=useState<'grid'|'list'>('grid')
  const [sortKey,setSortKey]=useState<SortKey>('nome')
  const [showSort,setShowSort]=useState(false)
  const [activeCol,setActiveCol]=useState<string|null>(null)
  const [showNewCol,setShowNewCol]=useState(false)
  const {cols,add,remove,toggle}=useCollections()

  useEffect(()=>{
    const stored=localStorage.getItem('legi-viz-theme')
    const pref=window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark=stored==='dark'||(!stored&&pref)
    setIsDark(dark)
    document.documentElement.classList.toggle('dark',dark)
    const ud=localStorage.getItem('legi-viz-user')
    if(ud) setUser(JSON.parse(ud)); else router.push('/login')
    const all=getAllParliamentarians()
    const ids:string[]=[]
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('legi-viz-saved-'))ids.push(k.replace('legi-viz-saved-',''))}
    setSaved(all.filter(p=>ids.includes(p.id)))
  },[router])

  const toggleTheme=()=>{ const n=!isDark; setIsDark(n); localStorage.setItem('legi-viz-theme',n?'dark':'light'); document.documentElement.classList.toggle('dark',n) }
  const handleLogout=()=>{ localStorage.removeItem('legi-viz-user'); router.push('/') }
  const removeSaved=useCallback((id:string)=>{ localStorage.removeItem(`legi-viz-saved-${id}`); setSaved(prev=>prev.filter(p=>p.id!==id)) },[])
  const openProfile=(p:Parlamentar)=>{ sessionStorage.setItem('legi-viz-open-profile',p.id); router.push('/') }

  const baseList=activeCol?saved.filter(p=>cols.find(c=>c.id===activeCol)?.ids.includes(p.id)):saved
  const displayList=[...baseList].sort((a,b)=>{
    if(sortKey==='nome')       return a.nomeUrna.localeCompare(b.nomeUrna)
    if(sortKey==='partido')    return a.partido.localeCompare(b.partido)
    if(sortKey==='patrimonio') return b.patrimonio-a.patrimonio
    if(sortKey==='mandatos')   return b.mandatos-a.mandatos
    if(sortKey==='frequencia') return b.frequencia-a.frequencia
    return 0
  })

  const bg=isDark?'#0A0A0A':'#F2F4F8'
  const fg=isDark?'#F0F0F0':'#0B1220'
  const sub=isDark?'rgba(255,255,255,0.42)':'rgba(0,0,0,0.42)'
  const brd=isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.08)'
  const hdr=isDark?'rgba(10,10,10,0.93)':'rgba(242,244,248,0.96)'
  const card=isDark?'#111':'#FFF'
  const SORT_OPTS:[SortKey,string][]=[['nome','A–Z'],['partido','Partido'],['patrimonio','Patrimônio ↓'],['mandatos','Mandatos ↓'],['frequencia','Frequência ↓']]

  if(!user) return <div style={{ minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:bg,color:fg,fontFamily:FONT }}>Carregando...</div>

  return (
    <div style={{ minHeight:'100dvh',background:bg,color:fg,display:'flex',flexDirection:'column' }}>

      {/* HEADER */}
      <header style={{ position:'sticky',top:0,zIndex:40,backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',background:hdr,borderBottom:`1px solid ${brd}`,flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 20px',maxWidth:1280,margin:'0 auto',width:'100%',boxSizing:'border-box' as const }}>
          <Link href="/" style={{ display:'flex',alignItems:'center',gap:5,color:sub,textDecoration:'none',fontSize:12,fontFamily:FONT,fontWeight:600,flexShrink:0 }}>
            <ArrowLeft size={14}/><span className="hidden sm:inline">Painel</span>
          </Link>
          <div style={{ flex:1,display:'flex',justifyContent:'center' }}><Logo className="h-5" isDark={isDark}/></div>
          <div style={{ display:'flex',gap:6 }}>
            <button onClick={toggleTheme} style={{ width:34,height:34,borderRadius:9,background:isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:fg }}>
              <span style={{ fontSize:13 }}>{isDark?'☀️':'🌙'}</span>
            </button>
            <button onClick={handleLogout} style={{ display:'flex',alignItems:'center',gap:5,padding:'0 12px',height:34,borderRadius:9,background:'rgba(239,68,68,0.09)',border:'none',cursor:'pointer',fontSize:11,fontFamily:FONT,fontWeight:700,color:'#EF4444' }}>
              <LogOut size={12}/>Sair
            </button>
          </div>
        </div>
      </header>

      {/* LAYOUT */}
      <div style={{ flex:1,display:'flex',maxWidth:1280,margin:'0 auto',width:'100%',boxSizing:'border-box' as const,minHeight:0 }}>

        {/* SIDEBAR */}
        <aside style={{ width:230,flexShrink:0,padding:'20px 0 40px 16px',display:'flex',flexDirection:'column',borderRight:`1px solid ${brd}`,position:'sticky',top:55,height:'calc(100vh - 55px)',overflowY:'auto' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingRight:14 }}>
            <div style={{ width:38,height:38,borderRadius:11,background:'linear-gradient(135deg,#22C55E,#16A34A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'#fff',flexShrink:0,fontFamily:FONT }}>{user.name.charAt(0).toUpperCase()}</div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:13,fontWeight:800,fontFamily:FONT,color:fg,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user.name}</p>
              <p style={{ fontSize:9,fontFamily:FONT,color:sub,margin:'1px 0 0' }}>{saved.length} favorito{saved.length!==1?'s':''}</p>
            </div>
          </div>
          <p style={{ fontSize:8,fontFamily:FONT,fontWeight:700,color:sub,textTransform:'uppercase' as const,letterSpacing:'0.09em',marginBottom:5,paddingRight:14 }}>Listas</p>
          <SidebarBtn active={activeCol===null} onClick={()=>setActiveCol(null)} fg={fg} sub={sub} isDark={isDark}>
            <div style={{ width:26,height:26,borderRadius:7,background:isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><Heart size={11} color={sub}/></div>
            <span style={{ fontSize:12,fontFamily:FONT,fontWeight:activeCol===null?700:500,color:activeCol===null?fg:sub,flex:1,textAlign:'left' as const }}>Todos os favoritos</span>
            <span style={{ fontSize:10,color:sub }}>{saved.length}</span>
          </SidebarBtn>
          {cols.map(c=>(
            <div key={c.id} style={{ display:'flex',alignItems:'center',gap:3,marginBottom:2 }}>
              <SidebarBtn active={activeCol===c.id} onClick={()=>setActiveCol(activeCol===c.id?null:c.id)} fg={fg} sub={sub} isDark={isDark} flex>
                <div style={{ width:26,height:26,borderRadius:7,background:`${c.color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><ColIcon iconId={c.icon} color={c.color} size={11}/></div>
                <span style={{ fontSize:12,fontFamily:FONT,fontWeight:activeCol===c.id?700:500,color:activeCol===c.id?fg:sub,flex:1,textAlign:'left' as const,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{c.name}</span>
                <span style={{ fontSize:10,color:sub,flexShrink:0 }}>{c.ids.filter(id=>saved.some(p=>p.id===id)).length}</span>
              </SidebarBtn>
              <button onClick={()=>remove(c.id)} style={{ width:22,height:22,background:'transparent',border:'none',cursor:'pointer',color:sub,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><X size={10}/></button>
            </div>
          ))}
          <button onClick={()=>setShowNewCol(true)} style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 12px 8px 8px',borderRadius:9,background:'transparent',border:`1px dashed ${brd}`,cursor:'pointer',color:sub,fontSize:11,fontFamily:FONT,marginTop:6,width:'100%',boxSizing:'border-box' as const }}>
            <Plus size={11}/> Nova coleção
          </button>
        </aside>

        {/* MAIN */}
        <main id="main-content" style={{ flex:1,padding:'22px 20px 64px',minWidth:0,overflowY:'auto' }}>
          {/* Toolbar */}
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap' as const }}>
            <h2 style={{ fontSize:16,fontWeight:900,fontFamily:FONT,color:fg,margin:0,flex:1,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
              {activeCol?(cols.find(c=>c.id===activeCol)?.name??'Coleção'):'Todos os favoritos'}
              <span style={{ fontSize:12,fontWeight:400,color:sub,marginLeft:8 }}>{displayList.length}</span>
            </h2>
            <div style={{ position:'relative' }}>
              <button onClick={()=>setShowSort(s=>!s)} style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 11px',borderRadius:9,background:isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.06)',border:'none',cursor:'pointer',fontSize:11,fontFamily:FONT,fontWeight:600,color:fg }}>
                <SortAsc size={12}/>{SORT_OPTS.find(([v])=>v===sortKey)?.[1]}<ChevronDown size={10}/>
              </button>
              {showSort&&<>
                <div onClick={()=>setShowSort(false)} style={{ position:'fixed',inset:0,zIndex:49 }}/>
                <div style={{ position:'absolute',top:'calc(100% + 6px)',right:0,zIndex:50,background:card,border:`1px solid ${brd}`,borderRadius:11,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,0.2)',minWidth:150 }}>
                  {SORT_OPTS.map(([v,l])=><button key={v} onClick={()=>{setSortKey(v);setShowSort(false)}} style={{ width:'100%',padding:'9px 13px',background:v===sortKey?(isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'):'transparent',border:'none',cursor:'pointer',fontSize:12,fontFamily:FONT,fontWeight:v===sortKey?700:500,color:fg,textAlign:'left' as const }}>{l}</button>)}
                </div>
              </>}
            </div>
            <div style={{ display:'flex',gap:2,padding:3,borderRadius:9,background:isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)' }}>
              {(['grid','list'] as const).map(m=>(
                <button key={m} onClick={()=>setViewMode(m)} style={{ width:30,height:30,borderRadius:7,background:viewMode===m?(isDark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.10)'):'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:viewMode===m?fg:sub }}>
                  {m==='grid'?<LayoutGrid size={13}/>:<List size={13}/>}
                </button>
              ))}
            </div>
          </div>

          {displayList.length===0&&<div style={{ padding:48,borderRadius:18,textAlign:'center' as const,background:isDark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.03)',border:`1px solid ${brd}` }}>
            <Heart size={32} style={{ marginBottom:14,opacity:0.15,color:fg }}/>
            <p style={{ fontSize:14,fontFamily:FONT,color:sub,marginBottom:16 }}>{activeCol?'Nenhum parlamentar nesta coleção.':'Você ainda não tem parlamentares favoritos.'}</p>
            <Link href="/" style={{ display:'inline-block',padding:'11px 22px',background:fg,color:bg,borderRadius:10,fontSize:12,fontFamily:FONT,fontWeight:700,textDecoration:'none' }}>Explorar parlamentares</Link>
          </div>}

          {viewMode==='grid'&&displayList.length>0&&<div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:12 }}>
            {displayList.map(p=><GridCard key={p.id} p={p} isDark={isDark} onRemove={()=>removeSaved(p.id)} onOpen={()=>openProfile(p)} collections={cols} onToggleMember={toggle}/>)}
          </div>}

          {viewMode==='list'&&displayList.length>0&&<div style={{ display:'flex',flexDirection:'column',gap:7 }}>
            {displayList.map(p=><ListCard key={p.id} p={p} isDark={isDark} onRemove={()=>removeSaved(p.id)} onOpen={()=>openProfile(p)} collections={cols} onToggleMember={toggle}/>)}
          </div>}
        </main>
      </div>

      {showNewCol&&<NewCollectionModal isDark={isDark} onClose={()=>setShowNewCol(false)} onCreate={add}/>}
    </div>
  )
}

function SidebarBtn({ active, onClick, children, fg, sub, isDark, flex }:{
  active:boolean; onClick:()=>void; children:React.ReactNode; fg:string; sub:string; isDark:boolean; flex?:boolean
}) {
  return (
    <button onClick={onClick} style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px 8px 8px',borderRadius:9,background:active?(isDark?'rgba(255,255,255,0.09)':'rgba(0,0,0,0.08)'):'transparent',border:'none',cursor:'pointer',marginBottom:2,width:'100%',minWidth:0,flex:flex?'1':undefined }}>
      {children}
    </button>
  )
}
