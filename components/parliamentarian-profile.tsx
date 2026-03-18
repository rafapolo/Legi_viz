'use client'

import {
  useMemo, useState, useRef, useCallback, useEffect,
  type TouchEvent, type MouseEvent as RMouseEvent,
} from 'react'
import {
  X, ChevronLeft, ChevronRight, Check, ThumbsUp, ThumbsDown,
  Minus, AlertTriangle, ExternalLink, Share2, Link2,
  CheckCircle2, Clock, FileText, Archive,
} from 'lucide-react'
import {
  type Parlamentar, mockVotes, mockBens, mockFinanciamento, TEMAS,
} from '@/lib/parliamentarians'
import { PatternDefs, PATTERNS, patStyle, type PatternConfig, FloatingPixel, PixelFloatStyles } from './pixel-patterns'
import { PARTY_COLORS } from './network-graph'

// ── CARD NAMES ────────────────────────────────────────────────
const CARD_NAMES = [
  'Quem é','Mandato','Associações','Temas','Patrimônio',
  'Campanha','Jurídico','Notícias',
]

// ── COLOUR PALETTE POOL ───────────────────────────────────────
// Each entry: [bg, name]. Shuffled each time a parliamentarian is opened.
const BG_POOL = [
  '#FF4D1C','#FFE135','#C8F752','#B8A9FF','#7FFFDA',
  '#FFD166','#A0D8FF','#FFC2B4','#D4F5A0','#FF85C8',
  '#FAEDCD','#CBF3F0','#FFBF69','#E9FF70','#C77DFF',
]

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickPalette(): string[] {
  return shuffle(BG_POOL).slice(0, 10)
}

// ── PIXEL DISSOLVE ENTRY ANIMATION ───────────────────────────
// Canvas-based pixel reveal: bitmap of random squares fades out
// revealing the card underneath. Fires once on mount.
function PixelReveal({ bg, onDone }: { bg: string; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Small delay to ensure the card has rendered and has dimensions
    const run = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.offsetWidth || (canvas.parentElement?.offsetWidth ?? window.innerWidth)
    const H = canvas.offsetHeight || (canvas.parentElement?.offsetHeight ?? window.innerHeight)
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const CELL = 8  // match network graph node size exactly
    const cols = Math.ceil(W / CELL)
    const rows = Math.ceil(H / CELL)
    const total = cols * rows
    // Randomize reveal order
    const order = Array.from({length:total}, (_,i)=>i)
    for (let i = order.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [order[i],order[j]]=[order[j],order[i]]
    }

    // Draw initial full grid
    ctx.fillStyle = bg
    ctx.fillRect(0,0,W,H)

    let frame = 0
    const TOTAL_FRAMES = 18
    const PER_FRAME = Math.ceil(total / TOTAL_FRAMES)

    const tick = () => {
      const start = frame * PER_FRAME
      const end   = Math.min(start + PER_FRAME, total)
      for (let i = start; i < end; i++) {
        const idx = order[i]
        const col = idx % cols
        const row = Math.floor(idx / cols)
        ctx.clearRect(col*CELL, row*CELL, CELL, CELL)
      }
      frame++
      if (frame < TOTAL_FRAMES) {
        requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0,0,W,H)
        onDone()
      }
    }
    const raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    } // end run
    const timer = setTimeout(run, 10)
    return () => clearTimeout(timer)
  }, [bg, onDone])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:'absolute', inset:0, width:'100%', height:'100%',
        pointerEvents:'none', zIndex:10,
      }}
    />
  )
}

// All text = preto puro para máxima legibilidade
const INK  = '#000000'
const INK2 = '#000000'  // Era cinza, agora preto
const INK3 = '#000000'  // Era cinza, agora preto

const TEMA_PATS: PatternConfig[] = [
  PATTERNS.saude, PATTERNS.segur, PATTERNS.agro, PATTERNS.educ,
  PATTERNS.econ,  PATTERNS.amb,   PATTERNS.infra, PATTERNS.direitos,
]

// lp() = monochrome version (for voting bars on colored bg)
function lp(pat: PatternConfig): PatternConfig {
  return { ...pat, pb: 'rgba(0,0,0,0.13)', pf: 'rgba(0,0,0,0.55)' }
}

// shufflePatterns() — shuffles the full-color TEMA_PATS for a given parliamentarian
// so each person's charts show a unique pattern arrangement
function shufflePatterns(idNumerico: number): PatternConfig[] {
  const pats = [...TEMA_PATS]
  // Fisher-Yates with seeded LCG
  let s = (idNumerico * 48271 + 1) >>> 0
  for (let i = pats.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    const j = s % (i + 1);
    [pats[i], pats[j]] = [pats[j], pats[i]]
  }
  return pats
}

// ── PHOTO — square rounded ────────────────────────────────────
function Photo({ p, size }: { p: Parlamentar; size: number }) {
  const [ok,  setOk]  = useState(false)
  const [err, setErr] = useState(false)
  const initials = p.nomeUrna.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
  const pColor   = PARTY_COLORS[p.partido] || '#64748B'
  const angle    = (p.idNumerico * 37) % 360
  const showImg  = !!p.urlFoto && !err
  const radius   = Math.round(size * 0.22) // square-ish with rounded corners

  return (
    <div style={{
      width:size, height:size,
      borderRadius:radius,
      flexShrink:0, background:`linear-gradient(${angle}deg,${pColor},${pColor}55)`,
      border:'3px solid rgba(0,0,0,0.18)',
      overflow:'hidden', position:'relative',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      {showImg && (
        <img src={p.urlFoto} alt={p.nomeUrna}
          onLoad={() => setOk(true)} onError={() => setErr(true)}
          style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',display:ok?'block':'none' }}
        />
      )}
      {!ok && (
        <span style={{ fontSize:size*0.33,fontWeight:800,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:'rgba(255,255,255,0.95)' }}>
          {initials}
        </span>
      )}
    </div>
  )
}

// ── PRIMITIVES ────────────────────────────────────────────────
function Lbl({ c, style }: { c: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK3,textTransform:'uppercase',letterSpacing:'0.08em',...style }}>{c}</p>
}
// Fluid big number — Helvetica Neue Black, uppercase
function Big({ c, style }: { c: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontSize:'clamp(20px,7vw,46px)',
      fontWeight:900, 
      fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif", 
      color:INK, 
      lineHeight:1,
      whiteSpace:'nowrap',
      overflow:'hidden',
      textOverflow:'ellipsis',
      letterSpacing:'-0.01em',
      textTransform:'uppercase',
      ...style,
    }}>{c}</p>
  )
}
function Hr() { return <div style={{ height:1,background:'rgba(0,0,0,0.12)',margin:'0 0' }} /> }
function PatBar({ value, max, pat, h=14 }: { value:number; max:number; pat:PatternConfig; h?:number }) {
  const pct = Math.max(0, Math.min(100, (value/max)*100))
  const ap  = lp(pat)
  return (
    <div style={{ height:h,borderRadius:99,background:'rgba(0,0,0,0.12)',overflow:'hidden' }}>
      <svg width={`${pct}%`} height={h} style={{ display:'block' }}>
        <PatternDefs /><rect width="100%" height={h} fill={`url(#${ap.id})`} style={patStyle(ap)} />
      </svg>
    </div>
  )
}

// ── STATE NAMES ───────────────────────────────────────────────
const UF_NAMES: Record<string,string> = {
  AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',
  DF:'Dist. Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',
  MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',
  PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',
  RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',
  SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins',
}

// ── CRIME DESCRIPTIONS ────────────────────────────────────────
const CRIME_DESC: Record<string,string> = {
  'Peculato':               'Desvio de dinheiro público por servidor que tinha acesso a ele por cargo.',
  'Corrupção passiva':      'Aceitar ou solicitar vantagem em troca de ato do cargo público.',
  'Lavagem de dinheiro':    'Disfarçar a origem ilícita de dinheiro, fazendo-o parecer legal.',
  'Crime eleitoral':        'Compra de votos, caixa 2 ou irregularidade no financiamento de campanha.',
  'Improbidade adm.':       'Conduta desonesta ou ilegal na gestão de recursos e bens públicos.',
}

// ── SHARE SHEET ───────────────────────────────────────────────
const SHARE_OPTIONS = [
  { id:'twitter',   label:'Twitter/X',
    href:(t:string,u:string)=>`https://twitter.com/intent/tweet?text=${t}&url=${u}` },
  { id:'whatsapp',  label:'WhatsApp',
    href:(t:string,u:string)=>`https://wa.me/?text=${t}%20${u}` },
  { id:'facebook',  label:'Facebook',
    href:(_:string,u:string)=>`https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { id:'linkedin',  label:'LinkedIn',
    href:(_:string,u:string)=>`https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  { id:'tiktok',    label:'TikTok',
    href:(_:string,u:string)=>`https://www.tiktok.com/share?url=${u}` },
  { id:'reels',     label:'Instagram',
    href:(_:string,u:string)=>`https://www.instagram.com/reels/` },
  { id:'stories',   label:'Instagram',
    href:(_:string,u:string)=>`https://www.instagram.com/` },
  { id:'post',      label:'Instagram',
    href:(_:string,u:string)=>`https://www.instagram.com/` },
  { id:'copy',      label:'Copiar link', href:null as any },
]

// SVG icons for share buttons - all black for contrast on white background
function ShareIcon({ id }: { id: string }) {
  const size = 22
  if (id === 'twitter') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
  if (id === 'whatsapp') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
  if (id === 'facebook') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
  if (id === 'linkedin') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
  if (id === 'tiktok') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  )
  // Instagram logo for reels, stories, post
  if (id === 'reels' || id === 'stories' || id === 'post') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
  // Copy link
  return <Link2 size={size}/>
}

function ShareSheet({ nome, cardName, bg, onClose }: {
  nome:string; cardName:string; bg:string; onClose:()=>void
}) {
  const url  = typeof window !== 'undefined' ? window.location.href : ''
  const text = encodeURIComponent(`${nome} · ${cardName} — Painel de Transparência`)
  const enc  = encodeURIComponent(url)
  const [cpd, setCpd] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(url) } catch {}
    setCpd(true); setTimeout(()=>setCpd(false),2000)
  }

  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center',background:'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div style={{ background:'#FFFFFF',borderRadius:'24px 24px 0 0',padding:'24px 20px 36px',width:'100%',maxWidth:500 }} onClick={e=>e.stopPropagation()}>
        <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK3,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:18 }}>
          Compartilhar · {cardName}
        </p>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18 }}>
          {SHARE_OPTIONS.map(opt => (
            <div key={opt.id} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:6 }}>
              {opt.href ? (
                <a href={opt.href(text,enc)} target="_blank" rel="noopener noreferrer"
                  style={{ width:52,height:52,borderRadius:14,background:'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none' }}>
                  <ShareIcon id={opt.id}/>
                </a>
              ) : (
                <button onClick={copy}
                  style={{ width:52,height:52,borderRadius:14,background:'#F1F5F9',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  {cpd ? <Check size={22} color="#000"/> : <ShareIcon id={opt.id}/>}
                </button>
              )}
              <span style={{ fontSize:10,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:'#000',textAlign:'center',lineHeight:1.2 }}>{cpd&&opt.id==='copy'?'Copiado!':opt.label}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ width:'100%',padding:'13px',borderRadius:12,background:'#000',border:'none',fontSize:14,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:bg,cursor:'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────
interface Props { parlamentar:Parlamentar; onBack:()=>void; isDark:boolean; onToggleTheme:()=>void; onSaveToggle?:(id:string, saved:boolean)=>void; showNavigation?: boolean; cardIndex?: number; onCardChange?: (idx: number) => void }

export function ParliamentarianProfile({ parlamentar:p, onBack, onSaveToggle, showNavigation = true, cardIndex: externalIdx, onCardChange }:Props) {
  const [idx, setIdx] = useState(0)
  const currentIdx = externalIdx !== undefined ? externalIdx : idx
  const setCurrentIdx = (newIdx: number) => {
    if (externalIdx !== undefined) {
      onCardChange?.(newIdx)
    } else {
      setIdx(newIdx)
    }
  }
  const [liked,    setLiked]   = useState(false)
  const [showShare,setShare]   = useState(false)
  const [dx,       setDx]      = useState(0)
  const [drag,     setDrag]    = useState(false)
  // Shuffle palette on each open
  const [palette]  = useState<string[]>(()=>pickPalette())
  const [cardReady, setCardReady] = useState(false)
  // Trigger entry animation when a new parliamentarian is opened
  useEffect(() => { setCardReady(false); const t = setTimeout(() => setCardReady(true), 30); return () => clearTimeout(t) }, [p.id])
  const sx = useRef(0)
  const N  = CARD_NAMES.length

  const seed  = parseInt(p.id.replace(/\D/g,''))||1
  const votes = useMemo(()=>mockVotes(seed),[seed])
  const bens  = useMemo(()=>mockBens(seed),[seed])
  const fin   = useMemo(()=>mockFinanciamento(seed),[seed])
  // Shuffled patterns unique to this parliamentarian
  const shuffledPats = useMemo(()=>shufflePatterns(p.idNumerico),[p.idNumerico])

  const [slideDir, setSlideDir] = useState<'left'|'right'|null>(null)
  const animLockRef = useRef(false)

  const go = useCallback((i:number)=>{
    const target = Math.max(0, Math.min(N-1, i))
    if (target === currentIdx || animLockRef.current) return
    const dir = target > currentIdx ? 'left' : 'right'
    animLockRef.current = true
    setSlideDir(dir)
    setTimeout(()=>{
      setCurrentIdx(target)
      setSlideDir(null)
      setTimeout(()=>{ animLockRef.current = false }, 200)
    }, 180)
  }, [N, currentIdx, setCurrentIdx])

  const onTS = (e:TouchEvent) => { sx.current=e.touches[0].clientX; setDrag(true); setDx(0) }
  const onTM = (e:TouchEvent) => { if(drag) setDx(e.touches[0].clientX-sx.current) }
  const onTE = () => { setDrag(false); if(dx<-60&&currentIdx<N-1)go(currentIdx+1); else if(dx>60&&currentIdx>0)go(currentIdx-1); setDx(0) }
  const onMD = (e:RMouseEvent) => { sx.current=e.clientX; setDrag(true); setDx(0) }
  const onMM = useCallback((e:globalThis.MouseEvent)=>{ if(drag) setDx(e.clientX-sx.current) },[drag])
  const onMU = useCallback(()=>{ if(!drag)return; setDrag(false); if(dx<-60&&currentIdx<N-1)go(currentIdx+1); else if(dx>60&&currentIdx>0)go(currentIdx-1); setDx(0) },[drag,dx,currentIdx,N,go])

  useEffect(()=>{ window.addEventListener('mousemove',onMM); window.addEventListener('mouseup',onMU); return()=>{ window.removeEventListener('mousemove',onMM); window.removeEventListener('mouseup',onMU) } },[onMM,onMU])
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==='ArrowRight'){e.preventDefault();go(currentIdx+1)}
      if(e.key==='ArrowLeft'){e.preventDefault();go(currentIdx-1)}
      if(e.key==='Escape'){e.preventDefault();onBack()}
    }
    window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[currentIdx,go])

  useEffect(()=>{ setLiked(!!localStorage.getItem(`legi-viz-saved-${p.id}`)) },[p.id])
  const toggleLike = ()=>{
    const next=!liked; setLiked(next)
    if(next) localStorage.setItem(`legi-viz-saved-${p.id}`,'1')
    else localStorage.removeItem(`legi-viz-saved-${p.id}`)
    onSaveToggle?.(p.id, next)
  }

  const bg = palette[currentIdx]

  return (
    <>
      <div
        style={{ position:'relative',zIndex:1,background:bg,display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',
          transition:'background 0.6s cubic-bezier(0.4,0,0.2,1)',
          transform: cardReady ? 'scale(1)' : 'scale(0.96)',
          opacity: cardReady ? 1 : 0,
          transitionProperty: 'transform, opacity, background',
          transitionDuration: '0.45s, 0.45s, 0.6s',
          transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1), ease, ease',
        }}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onMouseDown={onMD}
        role="dialog" aria-label={`Perfil de ${p.nomeUrna}`}
      >
        {/* Floating pixels removed per design update */}
        {/* TOP BAR - with card title centered */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',opacity:drag?0.3:1,transition:'opacity 0.2s',flexShrink:0 }}>
          <button onClick={onBack} style={{ width:38,height:38,border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:INK,cursor:'pointer',background:'transparent' }}>
            <X size={22} strokeWidth={2.5}/>
          </button>
          <span style={{ fontSize:15,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK,textAlign:'center' }}>{CARD_NAMES[currentIdx]}</span>
          <div style={{ display:'flex',gap:12 }}>
            <button onClick={toggleLike} style={{ width:38,height:38,border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:INK,cursor:'pointer',background:'transparent' }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill={liked?INK:'none'} stroke={INK} strokeWidth={2}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button onClick={()=>setShare(true)} style={{ width:38,height:38,border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:INK,cursor:'pointer',background:'transparent' }}>
              <Share2 size={22}/>
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{
            flex:1,overflowY:'auto',overflowX:'hidden',
            WebkitOverflowScrolling:'touch' as any,
            transform: drag
              ? `translateX(${dx*0.1}px)`
              : slideDir === 'left'
                ? 'translateX(-6%) scale(0.97)'
                : slideDir === 'right'
                  ? 'translateX(6%) scale(0.97)'
                  : 'translateX(0) scale(1)',
            opacity: slideDir ? 0 : 1,
            transition: drag ? 'none' : 'transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.24s ease',
          }}>
          {/* Inner centering wrapper — cards max 520px, items left-aligned inside */}
          <div style={{ maxWidth:520, margin:'0 auto', width:'100%' }}>
          {currentIdx===0&&<C0 p={p} votes={votes} palette={palette} pats={shuffledPats}/>}
          {currentIdx===1&&<C1 p={p}/>}
          {currentIdx===2&&<C8 p={p}/>}
          {currentIdx===3&&<C3 p={p} votes={votes} pats={shuffledPats}/>}
          {currentIdx===4&&<C4 bens={bens} pats={shuffledPats}/>}
          {currentIdx===5&&<C5 fin={fin} pats={shuffledPats}/>}
          {currentIdx===6&&<C7 p={p}/>}
          {currentIdx===7&&<C9 p={p}/>}
          </div>
        </div>

        {/* BOTTOM NAVIGATION - only dots, arrows are external */}
        {showNavigation && (
        <div style={{ padding:'12px 16px 24px',opacity:drag?0.2:1,transition:'opacity 0.2s',flexShrink:0 }}>
          {/* DOTS */}
          <div style={{ display:'flex',justifyContent:'center',gap:5 }}>
            {Array.from({length:N},(_,i)=>(
              <button key={i} onClick={()=>go(i)}
                style={{ width:i===currentIdx?20:6,height:6,borderRadius:99,background:i===currentIdx?INK:'rgba(0,0,0,0.25)',border:'none',cursor:'pointer',transition:'width 0.3s',padding:0 }}/>
            ))}
          </div>
        </div>
        )}
      </div>

      {showShare&&<ShareSheet nome={p.nomeUrna} cardName={CARD_NAMES[currentIdx]} bg={bg} onClose={()=>setShare(false)}/>}
    </>
  )
}

// ── HELPER: calcula lideranças e projetos mock ────────────────
function calcLiderancas(p: Parlamentar) {
  const seed = parseInt(p.id.replace(/\D/g,''))||1
  const rng = (n: number) => ((seed*n*7193)%1000)/1000
  
  const liderancas: { tipo: string; nome: string }[] = []
  
  // Liderança de partido (5% chance)
  if (rng(1) < 0.05) liderancas.push({ tipo: 'Líder do Partido', nome: p.partido })
  // Vice-líder de partido (10% chance)
  else if (rng(2) < 0.10) liderancas.push({ tipo: 'Vice-líder', nome: p.partido })
  
  // Líder de bancada (3% chance se tiver bancada)
  if (p.bancada !== 'Nenhuma' && rng(3) < 0.03) liderancas.push({ tipo: 'Líder de Bancada', nome: `Bancada ${p.bancada}` })
  
  // Presidente de comissão (3% chance)
  if (rng(4) < 0.03) {
    const comissoes = ['Constituição e Justiça', 'Finanças', 'Educação', 'Saúde', 'Meio Ambiente']
    liderancas.push({ tipo: 'Presidente', nome: `Comissão de ${comissoes[Math.floor(rng(5)*comissoes.length)]}` })
  }
  
  // Presidente da casa (0.3% - apenas 1 por casa)
  if (rng(6) < 0.003) {
    liderancas.push({ tipo: p.tipo === 'SENADOR' ? 'Presidente do Senado' : 'Presidente da Câmara', nome: 'Congresso Nacional' })
  }
  
  // 1° ou 2° secretário da Mesa (1% chance)
  if (rng(7) < 0.01) {
    liderancas.push({ tipo: `${Math.floor(rng(8)*2)+1}º Secretário`, nome: 'Mesa Diretora' })
  }
  
  return liderancas
}

function calcProjetos(p: Parlamentar) {
  const seed = parseInt(p.id.replace(/\D/g,''))||1
  const rng = (n: number) => ((seed*n*6571)%1000)/1000
  
  const desenvolvidos = Math.floor(5 + rng(1) * 45)
  const aprovados = Math.floor(rng(2) * desenvolvidos * 0.35)
  const emTramitacao = Math.floor(rng(3) * (desenvolvidos - aprovados) * 0.5)
  const arquivados = desenvolvidos - aprovados - emTramitacao
  
  return { desenvolvidos, aprovados, emTramitacao, arquivados }
}

// ─────────────────────────────────────────────────────────────
// C0 — QUEM É
// ─────────────────────────────────────────────────────────────
function C0({p,votes,palette,pats}:{p:Parlamentar;votes:ReturnType<typeof mockVotes>;palette:string[];pats:PatternConfig[]}) {
  const sim  = votes.filter(v=>v.pos==='sim').length
  const freq = Math.round(p.frequencia*100)
  const liderancas = calcLiderancas(p)
  
  // Mock data for salary and expenses (based on seed)
  const seed = parseInt(p.id.replace(/\D/g,''))||1
  const rng = (n: number) => ((seed*n*7193)%1000)/1000
  // Use real data if available, otherwise use estimates
  const salarioBruto = p.salario ?? Math.round(33300 + rng(1) * 2000)
  const cotasGastas = p.cotasTotal ?? Math.round(10000 + rng(2) * 25000)
  const emendas = p.emendas ?? Math.round(500000 + rng(3) * 2000000)
  const emendasPix = p.emendasPix ?? Math.round(100000 + rng(4) * 400000)

  return (
    <div style={{ padding:'0 18px 32px' }}>
      <div style={{ display:'flex',gap:14,alignItems:'flex-start',marginBottom:12 }}>
        <Photo p={p} size={80}/>
        <div style={{ flex:1,minWidth:0 }}>
          <Lbl c={`${p.tipo==='SENADOR'?'Senador(a)':'Dep. Federal'} · ${p.partido} · ${p.uf}`}/>
          <h2 style={{
            fontSize:'clamp(12px,3.5vw,22px)',
            fontWeight:900,
            fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",
            color:INK,
            lineHeight:1.05,
            margin:'5px 0 0',
            whiteSpace:'nowrap',
            overflow:'hidden',
            textOverflow:'ellipsis',
            width:'100%',
            display:'block',
          }}>
            {p.nomeUrna}
          </h2>
          {p.cassado && (
            <div style={{
              fontSize: 11,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 600,
              color: '#DC2626',
              marginTop: 4,
              backgroundColor: '#FEE2E2',
              padding: '4px 8px',
              borderRadius: 4,
              display: 'inline-block',
            }}>
              {p.cassado}
            </div>
          )}
        </div>
      </div>

      {/* Badges de liderança */}
      {liderancas.length > 0 && (
        <div style={{ display:'flex',flexDirection:'column',gap:0,marginBottom:16 }}>
          {liderancas.map((l,i) => (
            <div key={i} style={{ 
              padding:'8px 0',
              borderBottom:'1px solid rgba(0,0,0,0.12)',
              display:'flex',
              alignItems:'center',
              gap:8,
            }}>
              <CheckCircle2 size={14} color={INK} />
              <span style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK }}>
                {l.tipo}
              </span>
              <span style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>
                · {l.nome}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 4 key stats — fluid grid that never overflows */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
        {[
          {l:'Mandatos',    v:`${p.mandatos}×`,                          sub:'eleito(a)'},
          {l:'Salário',     v:`R$${salarioBruto.toLocaleString('pt-BR')}`,  sub:'bruto mensal'},
          {l:'Cotas',       v:`R$${cotasGastas.toLocaleString('pt-BR')}`,  sub:'gastas em 2024'},
          {l:'Presença',    v:`${freq}%`,                                 sub:'no plenário'},
        ].map(({l,v,sub})=>(
          <div key={l} style={{ padding:'14px 0',borderBottom:'1px solid rgba(0,0,0,0.12)',minWidth:0,overflow:'hidden' }}>
            <Lbl c={l}/>
            <Big c={v} style={{ margin:'5px 0 3px',fontSize:'clamp(17px,5.5vw,34px)' }}/>
            <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,margin:0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Emendas parliamentares */}
      <div style={{ padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.12)',marginBottom:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12 }}>
          <CheckCircle2 size={22} color={INK} style={{ flexShrink:0 }}/>
          <p style={{ fontSize:9,fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,textTransform:'uppercase',letterSpacing:'0.08em',margin:0 }}>Emendas apresentadas</p>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
          <div>
            <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,margin:0,marginBottom:2 }}>Emendas parlamentares</p>
            <p style={{ fontSize:24,fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,margin:0,lineHeight:1.1 }}>R${(emendas/1000).toFixed(0)}K</p>
          </div>
          <div>
            <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,margin:0,marginBottom:2 }}>Transferência especial (Pix)</p>
            <p style={{ fontSize:24,fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,margin:0,lineHeight:1.1 }}>R${(emendasPix/1000).toFixed(0)}K</p>
            {(p as any).ctxEmendas && <p style={{ fontSize:10,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:'#64748B',margin:0 }}>{(p as any).ctxEmendas.label} (z={(p as any).ctxEmendas.zScore})</p>}
          </div>
        </div>
      </div>

      {/* Resumo do parlamentar */}
      <Hr/>
      <div style={{ padding:'14px 0 0' }}>
        <Lbl c="Resumo do mandato"/>
        <p style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginTop:6,lineHeight:1.5 }}>
          {p.partido}/{p.uf} • {p.genero} • {p.raca}<br/>
          {p.mandatos > 1 ? `${p.mandatos} mandatos` : '1º mandato'} • {p.frequencia >= 0.8 ? 'Alta' : p.frequencia >= 0.5 ? 'Média' : 'Baixa'} presença ({Math.round(p.frequencia*100)}%)<br/>
          {p.processos > 0 ? `${p.processos} processos` : 'Sem processos'} • {p.patrimonio === 0 ? 'Patrimônio não declarado' : `Patrimônio ${(p as any).ctxPatrimonio?.label ?? ''} (z=${(p as any).ctxPatrimonio?.zScore})`}
        </p>
      </div>

          </div>
  )
}

// ─────────────────────────────────────────────────────────────
// C1 — MANDATO (antes era Trajetória)
// ─────────────────────────────────────────────────────────────
function C1({p}:{p:Parlamentar}) {
  const seed   = parseInt(p.id.replace(/\D/g,''))||1
  const cargos = ['Dep. Federal','Dep. Estadual','Vereador(a)']
  const mandatos = Array.from({length:p.mandatos},(_,i)=>({
    cargo: i===0?(p.tipo==='SENADOR'?'Senador(a)':'Dep. Federal'):cargos[i%3],
    de:   2023-i*4,
    ate:  i===0?'atual':String(2023-i*4+4),
    votos:Math.round(15000+((seed*(i+1)*7193)%90000)),
  }))
  const total = mandatos.reduce((a,m)=>a+m.votos,0)
  const liderancas = calcLiderancas(p)
  const projetos = calcProjetos(p)

  return (
    <div style={{ padding:'0 18px 32px' }}>
      <Lbl c="Mandato atual" style={{ marginBottom:6 }}/>
      <Big c={`${p.mandatos}º mandato`}/>

      {/* Lideranças e cargos */}
      {liderancas.length > 0 && (
        <>
          <Lbl c="Cargos e lideranças" style={{ marginBottom:8 }}/>
          <div style={{ display:'flex',flexDirection:'column',gap:0,marginBottom:16 }}>
            {liderancas.map((l,i) => (
              <div key={i} style={{ 
                padding:'10px 0',
                borderBottom:'1px solid rgba(0,0,0,0.12)',
                display:'flex',
                justifyContent:'space-between',
                alignItems:'center',
              }}>
                <span style={{ fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK }}>{l.tipo}</span>
                <span style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{l.nome}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Projetos desenvolvidos */}
      <Lbl c="Projetos de lei" style={{ marginBottom:8 }}/>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
        <div style={{ padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.12)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4 }}>
            <CheckCircle2 size={16} color={INK} />
            <p style={{ fontSize:10,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,textTransform:'uppercase',letterSpacing:'0.05em',margin:0 }}>Aprovados</p>
          </div>
          <p style={{ fontSize:22,fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,margin:0 }}>{projetos.aprovados}</p>
        </div>
        <div style={{ padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.12)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4 }}>
            <Clock size={16} color={INK} />
            <p style={{ fontSize:10,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,textTransform:'uppercase',letterSpacing:'0.05em',margin:0 }}>Em tramitação</p>
          </div>
          <p style={{ fontSize:22,fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,margin:0 }}>{projetos.emTramitacao}</p>
        </div>
        <div style={{ padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.12)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4 }}>
            <FileText size={16} color={INK} />
            <p style={{ fontSize:10,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,textTransform:'uppercase',letterSpacing:'0.05em',margin:0 }}>Total propostos</p>
          </div>
          <p style={{ fontSize:22,fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,margin:0 }}>{projetos.desenvolvidos}</p>
        </div>
        <div style={{ padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.12)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4 }}>
            <Archive size={16} color={INK} />
            <p style={{ fontSize:10,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,textTransform:'uppercase',letterSpacing:'0.05em',margin:0 }}>Arquivados</p>
          </div>
          <p style={{ fontSize:22,fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,margin:0 }}>{projetos.arquivados}</p>
        </div>
      </div>

      <Hr/>
      <div style={{ paddingTop:16 }}>
        <Lbl c="Trajetória política" style={{ marginBottom:10 }}/>
        {mandatos.map((m,i)=>(
          <div key={i} style={{ display:'flex',gap:12,alignItems:'flex-start',padding:'11px 0',borderBottom:'1px solid rgba(0,0,0,0.12)' }}>
            <div style={{ width:38,flexShrink:0,fontSize:12,fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>
              {String(m.de).slice(2)}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <p style={{ fontSize:14,fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginBottom:2 }}>{m.cargo}</p>
              <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{m.de} – {m.ate}</p>
            </div>
            <div style={{ textAlign:'right',flexShrink:0 }}>
              {i===0&&(
                <div style={{ display:'flex',alignItems:'center',gap:4,fontSize:10,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK,marginBottom:3 }}>
                  <Check size={12} color={INK} /> Atual
                </div>
              )}
              <p style={{ fontSize:10,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{m.votos.toLocaleString('pt-BR')} votos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// C2 — O QUE FEZ
// ─────────────────────────────────────────────────────────────
// ── Votações em destaque — com links reais ──────────────────
const VOTES_HL=[
  { id:1, nome:'PL da Anistia (8/1)',    desc:'Anistia a participantes de jan/2023',
    url:'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2387004',
    offsets:[7,13,17] as const },
  { id:2, nome:'PL do Aborto',           desc:'Aborto após 22 semanas = homicídio',
    url:'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2336586',
    offsets:[11,19,23] as const },
  { id:3, nome:'PEC 6×1',               desc:'Redução da jornada de trabalho',
    url:'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2444433',
    offsets:[13,29,31] as const },
  { id:4, nome:'Reforma Tributária',     desc:'Unificação de tributos (IVA dual)',
    url:'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2384527',
    offsets:[17,37,41] as const },
  { id:5, nome:'PL dos Penduricalhos',   desc:'Fim de benefícios extras a servidores',
    url:'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2412228',
    offsets:[19,43,47] as const },
  { id:6, nome:'PL da Bandidagem',       desc:'Pacote anti-crime / aumento de penas',
    url:'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2348784',
    offsets:[23,53,59] as const },
]

function pickVotoHL(idNum:number, offsets:readonly number[], vb?:string, isBandidagem?:boolean):'SIM'|'NÃO'|'ABSTENÇÃO'|'AUSENTE' {
  if(isBandidagem&&vb){const m:{[k:string]:'SIM'|'NÃO'|'ABSTENÇÃO'|'AUSENTE'}={sim:'SIM',nao:'NÃO',abs:'ABSTENÇÃO',aus:'AUSENTE'};return m[vb]??'AUSENTE'}
  const s=((Math.imul(1664525,idNum*offsets[0]+offsets[1])+1013904223)>>>0)/4294967296
  if(s<0.55)return 'SIM'; if(s<0.78)return 'NÃO'; if(s<0.90)return 'ABSTENÇÃO'; return 'AUSENTE'
}

function C2({votes,p,pats}:{votes:ReturnType<typeof mockVotes>;p:Parlamentar;pats:PatternConfig[]}) {
  const [hov,setHov]=useState<number|null>(null)
  const [clicked,setClicked]=useState<number|null>(null)
  const counts={sim:votes.filter(v=>v.pos==='sim').length,nao:votes.filter(v=>v.pos==='nao').length,abs:votes.filter(v=>v.pos==='abs').length,aus:votes.filter(v=>v.pos==='aus').length}
  const last=votes.slice(-32)
  const BW=11,GAP=3,H=150
  const svgW=last.length*(BW+GAP)+48
  const hv=hov!==null?last[hov]:null
  const cl=clicked!==null?last[clicked]:null
  const vb=(p as unknown as {votoBandidagem?:string}).votoBandidagem
  const hl=VOTES_HL.map(v=>({...v, voto:pickVotoHL(p.idNumerico,v.offsets,vb,v.id===6)}))

  return (
    <div style={{ padding:'0 0 32px' }}>
      <div style={{ padding:'0 18px' }}>
        <Lbl c="Votações registradas" style={{ marginBottom:6 }}/>
        <Big c={votes.length}/>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,margin:'18px 0' }}>
          {[{l:'SIM',v:counts.sim,icon:<ThumbsUp size={14} color={INK}/>},{l:'NÃO',v:counts.nao,icon:<ThumbsDown size={14} color={INK}/>},{l:'Abs',v:counts.abs,icon:<Minus size={14} color={INK}/>},{l:'Aus',v:counts.aus,icon:<X size={14} color={INK}/>}].map(({l,v,icon})=>(
            <div key={l} style={{ padding:'11px 0',borderBottom:'1px solid rgba(0,0,0,0.12)' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:4 }}>
                <div style={{ color:INK,display:'flex',alignItems:'center' }}>{icon}</div>
                <p style={{ fontSize:'clamp(15px,4vw,22px)',fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,lineHeight:1,margin:0 }}>{v}</p>
              </div>
              <p style={{ fontSize:9,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK,textTransform:'uppercase',textAlign:'center',margin:0 }}>{l}</p>
            </div>
          ))}
        </div>
        <div style={{ minHeight:32,marginBottom:7 }}>
          {cl?(
            <div style={{ borderBottom:'1px solid rgba(0,0,0,0.12)',padding:'5px 0',display:'inline-block' }}>
              <span style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK }}>{cl.data} · {cl.nome}</span>
              <span style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginLeft:8,opacity:0.7 }}>· {cl.pos.toUpperCase()}</span>
            </div>
          ):hv?(
            <div style={{ borderBottom:'1px solid rgba(0,0,0,0.12)',padding:'5px 0',display:'inline-block' }}><span style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK }}>{String(hv.tema)} · {hv.pos.toUpperCase()}</span></div>
          ):(
            <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>Toque/Clique numa barra · ↑ SIM  ↓ NÃO</p>
          )}
        </div>
      </div>
      {/* Gráfico 100% largura do card */}
      <div style={{ width:'100%',overflowX:'auto' }}>
        <svg width={Math.max(svgW, 320)} height={H} style={{ display:'block',width:'100%',minWidth:Math.max(svgW,320) }} onMouseLeave={()=>setHov(null)}>
          <PatternDefs/>
          <line x1={0} y1={H/2} x2={svgW} y2={H/2} stroke="rgba(0,0,0,0.15)" strokeWidth={2} strokeDasharray="5 4"/>
          {last.map((v,i)=>{
            const x=24+i*(BW+GAP); const pat=lp(pats[v.temaIdx%pats.length]); const isH=hov===i; const isC=clicked===i
            if(v.pos==='aus') return null
            if(v.pos==='abs') return (<g key={i}><rect x={x} y={H/2-9} width={BW} height={18} rx={3} fill="rgba(0,0,0,0.14)" opacity={hov!==null&&!isH?0.3:1}/><rect x={x} y={0} width={BW} height={H} fill="transparent" style={{ cursor:'pointer' }} onMouseEnter={()=>setHov(i)} onClick={()=>setClicked(i)}/></g>)
            const bh=Math.max(7,v.h*0.45); const y=v.pos==='nao'?H/2:H/2-bh
            return (<g key={i}><rect x={x} y={y} width={BW} height={bh} rx={3} fill={`url(#${pat.id})`} style={patStyle(pat)} opacity={hov!==null&&!isH?0.3:1}/>{(isH||isC)&&<rect x={x-2} y={y-2} width={BW+4} height={bh+4} rx={3} fill="none" stroke={INK} strokeWidth={2}/>}<rect x={x} y={0} width={BW} height={H} fill="transparent" style={{ cursor:'pointer' }} onMouseEnter={()=>setHov(i)} onClick={()=>setClicked(i)} onMouseLeave={()=>{setHov(null);setClicked(null)}}/></g>)
          })}
        </svg>
      </div>
      <div style={{ padding:'0 18px' }}>
        <Hr/>
        <div style={{ paddingTop:18 }}>
          <Lbl c="Votações em destaque" style={{ marginBottom:10 }}/>
          {hl.map(v=>(
            <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid rgba(0,0,0,0.12)',textDecoration:'none',cursor:'pointer' }}>
              <div style={{ flex:1,minWidth:0,paddingRight:9 }}>
                <p style={{ fontSize:13,fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{v.nome}</p>
                <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{v.desc}</p>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:4,flexShrink:0 }}>
                {v.voto==='SIM'?<ThumbsUp size={12} color={INK}/>:v.voto==='NÃO'?<ThumbsDown size={12} color={INK}/>:v.voto==='ABSTENÇÃO'?<Minus size={12} color={INK}/>:<X size={12} color={INK}/>}
                <span style={{ fontSize:11,fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{v.voto}</span>
                <ExternalLink size={10} color={INK} style={{opacity:0.4}}/>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// C3 — TEMAS (radar with clickable points)
// ─────────────────────────────────────────────────────────────
function C3({p,votes,pats}:{p:Parlamentar;votes:ReturnType<typeof mockVotes>;pats:PatternConfig[]}) {
  const [hov,setHov]=useState<number|null>(null)
  const [selectedTheme, setSelectedTheme] = useState<number|null>(null)
  const pColor=PARTY_COLORS[p.partido]||'#3B82F6'
  const data=TEMAS.map((tema,i)=>({tema,score:Math.round(p.temaScores[i]*100)}))
  const N2=data.length,SZ=260,cx=SZ/2,cy=SZ/2,R=95
  const axPts=data.map((_,i)=>{const a=(i/N2)*Math.PI*2-Math.PI/2;return{x:cx+R*Math.cos(a),y:cy+R*Math.sin(a)}})
  const dPts=data.map((d,i)=>{const a=(i/N2)*Math.PI*2-Math.PI/2;const r=(d.score/100)*R;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}})
  const poly=dPts.map(pt=>`${pt.x},${pt.y}`).join(' ')

  const selectedVotes = selectedTheme !== null 
    ? votes.filter(v => v.temaIdx === selectedTheme).slice(0, 5)
    : []

  return (
    <div style={{ padding:'0 18px 32px' }}>
      <Lbl c="Macro-tema principal" style={{ marginBottom:5 }}/>
      <Big c={p.macroTema}/>
      <p style={{ fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginBottom:16 }}>Área de maior atuação legislativa</p>
      <div style={{ minHeight:34,marginBottom:6 }}>
        {selectedTheme !== null ? (
          <div style={{ borderBottom:'1px solid rgba(0,0,0,0.12)',padding:'6px 0',display:'inline-block' }}>
            <span style={{ fontSize:14,fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{data[selectedTheme].tema}: {data[selectedTheme].score}%</span>
            <button 
              onClick={() => setSelectedTheme(null)}
              style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: INK, fontSize: 12 }}
            >
              (fechar)
            </button>
          </div>
        ) : hov !== null ? (
          <div style={{ borderBottom:'1px solid rgba(0,0,0,0.12)',padding:'6px 0',display:'inline-block' }}>
            <span style={{ fontSize:14,fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{data[hov].tema}: {data[hov].score}%</span>
          </div>
        ) : (
          <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>Toque/clique num ponto para ver projetos e votações</p>
        )}
      </div>
      <div style={{ width:'100%',display:'flex',justifyContent:'center',alignItems:'center',padding:'8px 0' }}>
        <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} style={{ overflow:'visible',maxWidth:'100%',width:'100%',maxHeight:300,display:'block' }}>
          {[0.25,0.5,0.75,1].map(pct=>{
            const ring=data.map((_,i)=>{const a=(i/N2)*Math.PI*2-Math.PI/2;return`${cx+R*pct*Math.cos(a)},${cy+R*pct*Math.sin(a)}`}).join(' ')
            return <polygon key={pct} points={ring} fill="none" stroke="rgba(128,128,128,0.2)" strokeWidth={1}/>
          })}
          {axPts.map((pt,i)=>(
            <g key={i}>
              <line x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="rgba(128,128,128,0.15)" strokeWidth={1}/>
              <text x={pt.x+(pt.x-cx)*0.27} y={pt.y+(pt.y-cy)*0.27+4} textAnchor="middle" fill={INK} fontSize={12} fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" fontWeight={700}>{data[i].tema}</text>
              <circle cx={pt.x+(pt.x-cx)*0.15} cy={pt.y+(pt.y-cy)*0.15} r={18} fill="transparent" style={{ cursor:'pointer' }} onClick={() => setSelectedTheme(i)} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}/>
            </g>
          ))}
          <PatternDefs/>
          <polygon points={poly} fill={`url(#${pats[0].id})`} style={patStyle(pats[0])} stroke={INK} strokeWidth={2.5} opacity={1}/>
          {dPts.map((pt,i)=>(
            <circle 
              key={i} 
              cx={pt.x} 
              cy={pt.y} 
              r={selectedTheme === i ? 10 : hov === i ? 8 : 5} 
              fill={selectedTheme === i ? pColor : INK} 
              stroke="white" 
              strokeWidth={2} 
              style={{ cursor:'pointer' }} 
              onClick={() => setSelectedTheme(i)}
              onMouseEnter={()=>setHov(i)} 
              onMouseLeave={()=>setHov(null)}
            />
          ))}
        </svg>
      </div>
      
      {/* Selected theme: projects and votes */}
      {selectedTheme !== null && selectedVotes.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid rgba(0,0,0,0.12)', paddingTop: 16 }}>
          <Lbl c={`Votações em ${data[selectedTheme].tema}`} style={{ marginBottom: 10 }}/>
          {selectedVotes.map((v, idx) => (
            <div key={idx} style={{ 
              padding: '10px 0', 
              borderBottom: '1px solid rgba(0,0,0,0.08)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <p style={{ 
                  fontSize: 11, 
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", 
                  color: INK, 
                  margin: 0,
                  flex: 1,
                  fontWeight: 700
                }}>
                  {v.nome}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                  {v.pos === 'sim' ? (
                    <ThumbsUp size={14} color={INK}/>
                  ) : v.pos === 'nao' ? (
                    <ThumbsDown size={14} color={INK}/>
                  ) : v.pos === 'abs' ? (
                    <Minus size={14} color={INK}/>
                  ) : (
                    <X size={14} color={INK}/>
                  )}
                  <span style={{ 
                    fontSize: 10, 
                    fontWeight: 700, 
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", 
                    color: INK 
                  }}>
                    {v.pos.toUpperCase()}
                  </span>
                </div>
              </div>
              <p style={{ 
                fontSize: 10, 
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", 
                color: INK, 
                margin: '0 0 6px 0', 
                opacity: 0.7,
                lineHeight: 1.3
              }}>
                {v.desc}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: INK, opacity: 0.5 }}>
                  {v.data}
                </span>
                <a 
                  href={v.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    fontSize: 10, 
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", 
                    color: INK,
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  Ver na Câmara →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// C4 — PATRIMÔNIO (Stacked Area Chart)
// ─────────────────────────────────────────────────────────────
// BEM_CATS uses dynamic pats — defined inside C4 now (see below)
const BEM_CAT_KEYS=[
  {key:'imoveis',  label:'Imóveis'},
  {key:'aplicacoes',label:'Aplicações'},
  {key:'veiculos', label:'Veículos'},
  {key:'outros',   label:'Outros'},
] as const

function C4({bens,pats}:{bens:ReturnType<typeof mockBens>;pats:PatternConfig[]}) {
  const BEM_CATS = BEM_CAT_KEYS.map((c,i)=>({...c, pat: pats[i % pats.length]}))
  const [active,setActive]=useState<string|null>(null)
  const [hoverYear,setHoverYear]=useState<number|null>(null)
  const ultimo=bens[bens.length-1]; const primeiro=bens[0]
  const totalU=ultimo.imoveis+ultimo.veiculos+ultimo.aplicacoes+ultimo.outros
  const totalP=primeiro.imoveis+primeiro.veiculos+primeiro.aplicacoes+primeiro.outros
  const delta=((totalU-totalP)/totalP*100)
  const maxVal=Math.max(...bens.map(b=>b.imoveis+b.veiculos+b.aplicacoes+b.outros))*1.1

  // Dimensões do gráfico — dinâmico
  const W=340, H=180, PAD_L=45, PAD_R=15, PAD_T=20, PAD_B=30
  const chartW=W-PAD_L-PAD_R, chartH=H-PAD_T-PAD_B

  // Calcular pontos para cada categoria (stacked)
  const years=bens.map(b=>b.ano)
  const xScale=(i:number)=>PAD_L+(i/(bens.length-1))*chartW
  const yScale=(v:number)=>PAD_T+chartH-(v/maxVal)*chartH

  // Criar áreas empilhadas (de baixo para cima: outros, veiculos, aplicacoes, imoveis)
  const stackOrder=['outros','veiculos','aplicacoes','imoveis'] as const
  const stacks=stackOrder.map((key,stackIdx)=>{
    const pat=BEM_CATS.find((c)=>c.key===key)!.pat
    const ap=lp(pat)
    
    // Calcular baseline (soma das categorias anteriores)
    const baseline=bens.map(b=>{
      let sum=0
      for(let i=0;i<stackIdx;i++) sum+=b[stackOrder[i]]
      return sum
    })
    
    // Calcular topline (baseline + valor atual)
    const topline=bens.map((b,i)=>baseline[i]+b[key])
    
    // Criar path para área
    const topPoints=topline.map((v,i)=>`${xScale(i)},${yScale(v)}`).join(' L ')
    const botPoints=[...baseline].reverse().map((v,i)=>`${xScale(bens.length-1-i)},${yScale(v)}`).join(' L ')
    const d=`M ${topPoints} L ${botPoints} Z`
    
    return {key,d,ap,label:BEM_CATS.find(c=>c.key===key)!.label}
  })

  return (
    <div style={{ padding:'0 18px 32px' }}>
      <Lbl c={`Patrimônio declarado — ${ultimo.ano}`} style={{ marginBottom:5 }}/>
      <Big c={`R$${(totalU/1000).toFixed(1)}M`}/>
      <div style={{ display:'inline-flex',alignItems:'center',gap:6,marginTop:7,marginBottom:20,padding:'4px 0',borderBottom:'1px solid rgba(0,0,0,0.12)' }}>
        <span style={{ fontSize:13,fontWeight:900,fontFamily:'Helvetica Neue, sans-serif',color:INK }}>{delta>0?'▲':'▼'} {Math.abs(delta).toFixed(0)}%</span>
        <span style={{ fontSize:11,fontFamily:'Helvetica Neue, sans-serif',color:INK }}>desde {primeiro.ano}</span>
      </div>
      
      {/* Legenda */}
      <div style={{ display:'flex',flexWrap:'wrap',gap:10,marginBottom:14 }}>
        {[...BEM_CATS].reverse().map(({key,label,pat})=>{const ap=pat;const isA=active===key;return(
          <button key={key} onClick={()=>setActive(active===key?null:key)} style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 0',borderBottom:isA?'2px solid rgba(0,0,0,0.8)':'2px solid transparent',background:'transparent',cursor:'pointer' }}>
            <svg width={14} height={10} style={{ borderRadius:2,overflow:'hidden',flexShrink:0 }}><PatternDefs/><rect width={14} height={10} fill={`url(#${ap.id})`} style={patStyle(ap)}/></svg>
            <span style={{ fontSize:11,fontFamily:'Helvetica Neue, sans-serif',fontWeight:600,color:INK }}>{label}</span>
          </button>
        )})}
      </div>
      
      {/* Stacked Area Chart - full card width */}
      <div style={{ width:'100%' }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible',display:'block' }}>
          <PatternDefs/>
          
          {/* Grid horizontal */}
          {[0,0.25,0.5,0.75,1].map(pct=>{
            const y=PAD_T+chartH*(1-pct)
            const val=maxVal*pct/1000
            return (
              <g key={pct}>
                <line x1={PAD_L} y1={y} x2={W-PAD_R} y2={y} stroke="rgba(0,0,0,0.1)" strokeDasharray="2,2"/>
                <text x={PAD_L-5} y={y} textAnchor="end" alignmentBaseline="middle" fontSize={9} fontFamily="Helvetica Neue, sans-serif" fill={INK}>{val.toFixed(1)}M</text>
              </g>
            )
          })}
          
          {/* Áreas empilhadas */}
          {stacks.map(({key,d,ap})=>(
            <path key={key} d={d} fill={`url(#${ap.id})`} style={patStyle(ap)} opacity={active&&active!==key?0.15:0.9}/>
          ))}
          
          {/* Linha de contorno no topo */}
          <path 
            d={`M ${bens.map((b,i)=>`${xScale(i)},${yScale(b.imoveis+b.aplicacoes+b.veiculos+b.outros)}`).join(' L ')}`} 
            fill="none" 
            stroke={INK} 
            strokeWidth={1.5}
          />
          
          {/* Anos no eixo X */}
          {years.map((ano,i)=>(
            <text key={ano} x={xScale(i)} y={H-8} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="Helvetica Neue, sans-serif" fill={INK}>{ano}</text>
          ))}
          
          {/* Pontos e interatividade */}
          {bens.map((b,i)=>{
            const tot=b.imoveis+b.aplicacoes+b.veiculos+b.outros
            const x=xScale(i), y=yScale(tot)
            return (
              <g key={b.ano} onMouseEnter={()=>setHoverYear(b.ano)} onMouseLeave={()=>setHoverYear(null)} style={{ cursor:'pointer' }}>
                <rect x={x-15} y={PAD_T} width={30} height={chartH} fill="transparent"/>
                <circle cx={x} cy={y} r={hoverYear===b.ano?6:4} fill={INK}/>
                {hoverYear===b.ano&&(
                  <g>
                    <rect x={x-40} y={y-55} width={80} height={45} rx={4} fill="currentColor" opacity={0.95}/>
                    <text x={x} y={y-38} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily="Helvetica Neue, sans-serif" fill="#FFF">R${(tot/1000).toFixed(1)}M</text>
                    <text x={x} y={y-22} textAnchor="middle" fontSize={9} fontFamily="Helvetica Neue, sans-serif" fill="#94A3B8">{b.ano}</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      
      {/* Detalhes da categoria selecionada */}
      {active&&(
        <div style={{ marginTop:14,padding:'10px 0',borderTop:'1px solid rgba(0,0,0,0.12)' }}>
          <p style={{ fontSize:12,fontWeight:700,fontFamily:'Helvetica Neue, sans-serif',color:INK,marginBottom:6 }}>{BEM_CATS.find(c=>c.key===active)?.label}</p>
          <div style={{ display:'flex',gap:16,flexWrap:'wrap' }}>
            {bens.map(b=>(
              <div key={b.ano} style={{ textAlign:'center' }}>
                <p style={{ fontSize:10,fontFamily:'Helvetica Neue, sans-serif',color:INK,opacity:0.6 }}>{b.ano}</p>
                <p style={{ fontSize:13,fontWeight:700,fontFamily:'Helvetica Neue, sans-serif',color:INK }}>R${((b[active as keyof typeof b] as number)/1000).toFixed(1)}M</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// C5 — CAMPANHA (pie)
// ─────────────────────────────────────────────────────────────
function C5({fin,pats}:{fin:ReturnType<typeof mockFinanciamento>;pats:PatternConfig[]}) {
  const [active,setActive]=useState<number|null>(null)
  const slices=[
    {label:'Fundo Partidário',val:fin.partido,pat:pats[0]},
    {label:'Pessoas Físicas',val:fin.pf,pat:pats[1]},
    {label:'Recursos Próprios',val:fin.proprio,pat:pats[2]},
  ]
  const total=slices.reduce((a,s)=>a+s.val,0)
  const R=95,cx=130,cy=130,SZ=260,INNER=52
  let cumAngle=-Math.PI/2
  const arcs=slices.map((s,i)=>{
    const pct=s.val/total; const start=cumAngle; const end=cumAngle+pct*2*Math.PI; cumAngle=end
    const radius=active===i?R+8:R; const large=pct>0.5?1:0
    const x1=cx+radius*Math.cos(start),y1=cy+radius*Math.sin(start)
    const x2=cx+radius*Math.cos(end),y2=cy+radius*Math.sin(end)
    const xi1=cx+INNER*Math.cos(start),yi1=cy+INNER*Math.sin(start)
    const xi2=cx+INNER*Math.cos(end),yi2=cy+INNER*Math.sin(end)
    const d=[`M ${xi1} ${yi1}`,`L ${x1} ${y1}`,`A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`,`L ${xi2} ${yi2}`,`A ${INNER} ${INNER} 0 ${large} 0 ${xi1} ${yi1}`,'Z'].join(' ')
    return {...s,d,pct,i}
  })
  const activeSlice=active!==null?arcs[active]:null

  return (
    <div style={{ padding:'0 18px 32px' }}>
      <Lbl c="Financiamento eleitoral · 2022" style={{ marginBottom:5 }}/>
      <Big c={`R$${fin.total.toLocaleString('pt-BR')}`}/>
      <p style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginBottom:18 }}>mil reais arrecadados</p>
      <div style={{ display:'flex',justifyContent:'center',marginBottom:14 }}>
        <svg width={SZ} height={SZ} style={{ overflow:'visible',maxWidth:'100%' }}>
          <PatternDefs/>
          {arcs.map(arc=>{const ap=lp(arc.pat);return(
            <g key={arc.label}>
              <path d={arc.d} fill={`url(#${ap.id})`} style={{ ...patStyle(ap),cursor:'pointer' }} opacity={active!==null&&active!==arc.i?0.35:1} onClick={()=>setActive(active===arc.i?null:arc.i)} onMouseEnter={()=>setActive(arc.i)} onMouseLeave={()=>setActive(null)}/>
            </g>
          )})}
          <text x={cx} y={cy-7} textAnchor="middle" fontSize={13} fontFamily="sans-serif" fontWeight={700} fill={INK}>{activeSlice?`${Math.round(activeSlice.pct*100)}%`:'100%'}</text>
          <text x={cx} y={cy+10} textAnchor="middle" fontSize={10} fontFamily="sans-serif" fill={INK}>{activeSlice?activeSlice.label.split(' ')[0]:'total'}</text>
        </svg>
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:0 }}>
        {arcs.map(arc=>{const ap=lp(arc.pat);return(
          <div key={arc.label} style={{ display:'flex',alignItems:'center',gap:11,padding:'11px 0',borderBottom:'1px solid rgba(0,0,0,0.12)',cursor:'pointer' }} onClick={()=>setActive(active===arc.i?null:arc.i)}>
            <svg width={28} height={28} style={{ borderRadius:4,overflow:'hidden',flexShrink:0 }}><PatternDefs/><rect width={28} height={28} fill={`url(#${ap.id})`} style={patStyle(ap)}/></svg>
            <span style={{ flex:1,fontSize:13,fontWeight:600,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{arc.label}</span>
            <span style={{ fontSize:15,fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{Math.round(arc.pct*100)}%</span>
          </div>
        )})}
      </div>
      <div style={{ marginTop:14,padding:'11px 0',borderBottom:'1px solid rgba(0,0,0,0.12)' }}>
        <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,lineHeight:1.5 }}>ADI 4.650/2015 · Doações de PJ a candidatos proibidas desde 2016.</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// C6 — ELEITORES (mapa SVG Brasil)
// ─────────────────────────────────────────────────────────────
const BR_STATES=[
  {uf:'AM',cx:0.21,cy:0.26,r:0.11},{uf:'PA',cx:0.40,cy:0.25,r:0.10},
  {uf:'RR',cx:0.24,cy:0.09,r:0.05},{uf:'AP',cx:0.40,cy:0.10,r:0.04},
  {uf:'AC',cx:0.12,cy:0.36,r:0.05},{uf:'RO',cx:0.22,cy:0.41,r:0.05},
  {uf:'TO',cx:0.45,cy:0.36,r:0.05},{uf:'MA',cx:0.54,cy:0.22,r:0.05},
  {uf:'PI',cx:0.59,cy:0.29,r:0.05},{uf:'CE',cx:0.66,cy:0.22,r:0.04},
  {uf:'RN',cx:0.72,cy:0.24,r:0.03},{uf:'PB',cx:0.73,cy:0.29,r:0.03},
  {uf:'PE',cx:0.70,cy:0.34,r:0.04},{uf:'AL',cx:0.72,cy:0.39,r:0.03},
  {uf:'SE',cx:0.71,cy:0.44,r:0.03},{uf:'BA',cx:0.61,cy:0.46,r:0.07},
  {uf:'MT',cx:0.32,cy:0.47,r:0.07},{uf:'GO',cx:0.43,cy:0.54,r:0.05},
  {uf:'MS',cx:0.36,cy:0.61,r:0.06},{uf:'DF',cx:0.45,cy:0.55,r:0.025},
  {uf:'MG',cx:0.56,cy:0.57,r:0.07},{uf:'ES',cx:0.65,cy:0.58,r:0.03},
  {uf:'RJ',cx:0.62,cy:0.65,r:0.03},{uf:'SP',cx:0.53,cy:0.67,r:0.06},
  {uf:'PR',cx:0.47,cy:0.73,r:0.05},{uf:'SC',cx:0.50,cy:0.79,r:0.04},
  {uf:'RS',cx:0.47,cy:0.87,r:0.06},
]

function C6({p,pats}:{p:Parlamentar;pats:PatternConfig[]}) {
  const seed=parseInt(p.id.replace(/\D/g,''))||1
  const rng=(n:number)=>((seed*n*6571+n*1009)%1000)/1000
  const stateData=BR_STATES.map((s,i)=>({...s,pct:Math.round(2+rng(i+1)*38),votos:Math.round(500+rng(i+2)*80000)}))
  const maxPct=Math.max(...stateData.map(s=>s.pct))
  const total=stateData.reduce((a,s)=>a+s.votos,0)
  const [hovUF,setHovUF]=useState<string|null>(null)
  const hovered=hovUF?stateData.find(s=>s.uf===hovUF):null
  // responsive map size
  const [W,setW]=useState(320)
  const mapRef=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const obs=new ResizeObserver(entries=>{ const w=entries[0].contentRect.width; if(w>0) setW(Math.min(w,360)) })
    if(mapRef.current) obs.observe(mapRef.current)
    return()=>obs.disconnect()
  },[])
  const H=Math.round(W*1.1)

  return (
    <div style={{ padding:'0 18px 32px' }}>
      <Lbl c="Distribuição de votos · 2022" style={{ marginBottom:5 }}/>
      <Big c={total.toLocaleString('pt-BR')}/>
      <p style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginBottom:14 }}>votos no total</p>

      {/* Tooltip */}
      <div style={{ minHeight:32,marginBottom:6 }}>
        {hovered?(
          <div style={{ borderBottom:'1px solid rgba(0,0,0,0.12)',padding:'6px 0',display:'inline-block' }}>
            <span style={{ fontSize:13,fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>
              {hovered.uf} · {UF_NAMES[hovered.uf]} · {hovered.pct}% · {hovered.votos.toLocaleString('pt-BR')} votos
            </span>
          </div>
        ):(
          <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>Toque em um estado para ver detalhes</p>
        )}
      </div>

      {/* SVG Map — centred */}
      <div ref={mapRef} style={{ width:'100%',display:'flex',justifyContent:'center',alignItems:'center' }}>
        <svg width={W} height={H} style={{ display:'block',touchAction:'none' }} viewBox={`0 0 ${W} ${H}`}>
          <PatternDefs/>
          {stateData.map(state=>{
            const scx=state.cx*W, scy=state.cy*H
            const base=state.r*Math.min(W,H)
            const alpha=0.15+(state.pct/maxPct)*0.85
            const isH=hovUF===state.uf
            const pat=lp(pats[Math.floor(state.pct*pats.length/Math.max(maxPct,1)) % pats.length])
            return (
              <g key={state.uf} style={{ cursor:'pointer' }}
                onMouseEnter={()=>setHovUF(state.uf)} onMouseLeave={()=>setHovUF(null)}
                onClick={()=>setHovUF(hovUF===state.uf?null:state.uf)}>
                <ellipse cx={scx} cy={scy} rx={base*1.35} ry={base}
                  fill={`url(#${pat.id})`} style={patStyle(pat)}
                  opacity={alpha*(isH?1:0.8)} stroke={isH?INK:'rgba(0,0,0,0.2)'} strokeWidth={isH?2:1}/>
                <text x={scx} y={scy+1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={isH?10:8} fontFamily="sans-serif" fontWeight={700} fill={INK} style={{ pointerEvents:'none' }}>
                  {state.uf}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <Hr/>
      <div style={{ paddingTop:14 }}>
        <Lbl c="Top 5 estados" style={{ marginBottom:9 }}/>
        {[...stateData].sort((a,b)=>b.pct-a.pct).slice(0,5).map((s,i)=>(
          <div key={s.uf} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,0.09)' }}>
            <span style={{ fontSize:14,fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{i+1}. {s.uf} · {UF_NAMES[s.uf]}</span>
            <span style={{ fontSize:13,fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// C7 — JURÍDICO
// ─────────────────────────────────────────────────────────────
const TIPOS_CRIME=[
  {nome:'Peculato',             desc:'Desvio de dinheiro público por servidor que tinha acesso a ele pelo cargo.'},
  {nome:'Corrupção passiva',    desc:'Aceitar ou solicitar vantagem em troca de ato do cargo público.'},
  {nome:'Lavagem de dinheiro',  desc:'Disfarçar a origem ilícita de dinheiro para fazê-lo parecer legal.'},
  {nome:'Crime eleitoral',      desc:'Compra de votos, caixa 2 ou irregularidade no financiamento de campanha.'},
  {nome:'Improbidade adm.',     desc:'Conduta desonesta ou ilegal na administração de recursos e bens públicos.'},
]

function C7({p}:{p:Parlamentar}) {
  const seed=parseInt(p.id.replace(/\D/g,''))||1
  const hasProc=seed%3===0; const count=hasProc?(seed%5)+1:0

  return (
    <div style={{ padding:'0 18px 32px' }}>
      <Lbl c="Situação jurídica" style={{ marginBottom:5 }}/>
      <p style={{ fontSize:'clamp(20px,7vw,42px)',fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,lineHeight:1,margin:'5px 0 3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{hasProc?`${count} processo${count>1?'s':''}`:'Sem processos'}</p>
      <p style={{ fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginTop:5,marginBottom:18 }}>
        {hasProc?'em tramitação nos tribunais':'localizados nos registros públicos'}
      </p>
      <div style={{ padding:'14px 0',borderBottom:'1px solid rgba(0,0,0,0.12)',display:'flex',gap:11,alignItems:'flex-start',marginBottom:18 }}>
        {hasProc?<AlertTriangle size={19} style={{ color:INK,flexShrink:0,marginTop:2 }}/>:<Check size={19} style={{ color:INK,flexShrink:0,marginTop:2 }}/>}
        <p style={{ fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,lineHeight:1.55 }}>
          {hasProc?'Processos em tramitação. Existência de inquérito não implica culpa.':'Nenhum processo encontrado nos registros públicos consultados.'}
        </p>
      </div>
      {hasProc&&(
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:18 }}>
          {Array.from({length:count},(_,i)=>{
            const crime=TIPOS_CRIME[i%TIPOS_CRIME.length]
            return (
              <div key={i} style={{ padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.12)' }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                  <p style={{ fontSize:12,fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>Inq. #{seed*100+i} · {crime.nome}</p>
                  <span style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,flexShrink:0,marginLeft:8 }}>STF · {2020+i}</span>
                </div>
                <p style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,lineHeight:1.5,margin:0 }}>{crime.desc}</p>
              </div>
            )
          })}
        </div>
      )}
      <div style={{ padding:'11px 0',borderBottom:'1px solid rgba(0,0,0,0.12)' }}>
        <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,lineHeight:1.5 }}>CF/88, Art. 5º LVII — presunção de inocência até trânsito em julgado.</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// C8 — ASSOCIAÇÕES (agora é o 3º card, depois de Mandato)
// ──────────────���────────���─────────────────────────────────────
function C8({p}:{p:Parlamentar}) {
  const seed=parseInt(p.id.replace(/\D/g,''))||1
  const rng = (n: number) => ((seed*n*7193)%1000)/1000
  
  // Frentes parlamentares - mais variadas e baseadas na bancada
  const allFrentes = [
    { nome: 'Frente Parlamentar Evangélica', bancada: 'Evangelica' },
    { nome: 'Frente Parlamentar da Agropecuária', bancada: 'Ruralista' },
    { nome: 'Frente da Segurança Pública', bancada: 'Bala' },
    { nome: 'Frente Parlamentar Ambientalista', bancada: 'Ambientalista' },
    { nome: 'Frente Parlamentar da Saúde', bancada: 'Nenhuma' },
    { nome: 'Frente Parlamentar do Turismo', bancada: 'Nenhuma' },
    { nome: 'Frente Parlamentar Mista da Educação', bancada: 'Nenhuma' },
    { nome: 'Frente Parlamentar em Defesa das Mulheres', bancada: 'Feminina' },
    { nome: 'Frente Parlamentar em Defesa da Cultura', bancada: 'Nenhuma' },
    { nome: 'Frente do Empreendedorismo', bancada: 'Empresarial' },
  ]
  
  // Seleciona frentes baseado na bancada e seed
  const frentes = allFrentes.filter((f, i) => 
    f.bancada === p.bancada || (rng(i + 1) < 0.25)
  ).slice(0, 4)
  
  // Comissões permanentes
  const allComissoes = [
    'Constituição e Justiça e de Cidadania',
    'Finanças e Tributação',
    'Educação',
    'Saúde',
    'Meio Ambiente e Desenvolvimento Sustentável',
    'Segurança Pública',
    'Agricultura e Abastecimento',
    'Relações Exteriores',
    'Defesa do Consumidor',
    'Trabalho, Administração e Serviço Público',
  ]
  const comissoes = allComissoes.filter((_,i) => rng(i + 10) < 0.3).slice(0, 3)
  
  // Lideranças
  const liderancas = calcLiderancas(p)
  
  // Histórico partidário
  const historico = [
    { partido: p.partido, de: 2019, ate: 'atual' },
    ...(rng(100) < 0.6 ? [{ partido: ['MDB', 'PSDB', 'DEM', 'PP', 'PTB'][Math.floor(rng(101) * 5)], de: 2015, ate: '2019' }] : []),
    ...(rng(102) < 0.3 ? [{ partido: ['PMDB', 'PFL', 'PSB', 'PDT'][Math.floor(rng(103) * 4)], de: 2010, ate: '2015' }] : []),
  ]
  
  const totalVinculos = frentes.length + comissoes.length + liderancas.length

  return (
    <div style={{ padding:'0 18px 32px' }}>
      <Lbl c="Associações e vínculos" style={{ marginBottom:5 }}/>
      <Big c={`${totalVinculos} vínculos`}/>
      <p style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginBottom:16 }}>identificados no Congresso</p>
      
      {/* Cargos e lideranças */}
      {liderancas.length > 0 && (
        <>
          <Lbl c="Cargos e lideranças" style={{ marginBottom:8 }}/>
          <div style={{ display:'flex',flexDirection:'column',gap:0,marginBottom:16 }}>
            {liderancas.map((l,i) => (
              <div key={i} style={{ 
                padding:'10px 0',
                borderBottom:'1px solid rgba(0,0,0,0.12)',
                display:'flex',
                alignItems:'center',
                gap:8,
              }}>
                <CheckCircle2 size={14} color={INK} />
                <span style={{ fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK }}>{l.tipo}</span>
                <span style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>· {l.nome}</span>
              </div>
            ))}
          </div>
          <Hr/>
        </>
      )}

      {/* Frentes parlamentares */}
      <div style={{ paddingTop:liderancas.length > 0 ? 16 : 0, marginBottom:16 }}>
        <Lbl c="Frentes parlamentares" style={{ marginBottom:10 }}/>
        <div style={{ display:'flex',flexDirection:'column',gap:0 }}>
          {frentes.length ? frentes.map((f,i) => (
            <div key={i} style={{ 
              padding:'10px 0',
              borderBottom:'1px solid rgba(0,0,0,0.12)',
              display:'flex',
              alignItems:'center',
              gap:8,
            }}>
              {f.bancada === p.bancada ? (
                <CheckCircle2 size={14} color={INK} />
              ) : (
                <Clock size={14} color={INK} />
              )}
              <span style={{ fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:600,color:INK }}>{f.nome}</span>
            </div>
          )) : (
            <span style={{ fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>Nenhuma frente identificada</span>
          )}
        </div>
      </div>
      <Hr/>
      
      {/* Comissões */}
      <div style={{ paddingTop:16,marginBottom:16 }}>
        <Lbl c="Comissões permanentes" style={{ marginBottom:9 }}/>
        {comissoes.length ? comissoes.map((c,i)=>(
          <div key={i} style={{ padding:'10px 0',borderBottom:'1px solid rgba(0,0,0,0.08)',fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,fontWeight:600 }}>
            {c}
          </div>
        )) : (
          <span style={{ fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>Nenhuma comissão identificada</span>
        )}
      </div>
      <Hr/>
      
      {/* Histórico partidário */}
      <div style={{ paddingTop:16 }}>
        <Lbl c="Histórico partidário" style={{ marginBottom:9 }}/>
        {historico.map((item,i,arr)=>(
          <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<arr.length-1?'1px solid rgba(0,0,0,0.09)':'none' }}>
            <span style={{ fontSize:16,fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{item.partido}</span>
            <span style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>{item.de} – {item.ate}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────��───────────────────────────────────────────────────────
// C9 — NOTÍCIAS (com fontes RSS)
// ─────────────────────────────────────────────────────────────
// Lista de fontes RSS de grande mídia e mídia alternativa
const NEWS_SOURCES = [
  { name: 'Folha de S.Paulo', rss: 'https://feeds.folha.uol.com.br/poder/rss091.xml', type: 'grande' },
  { name: 'O Globo', rss: 'https://oglobo.globo.com/rss/politica', type: 'grande' },
  { name: 'Estadão', rss: 'https://www.estadao.com.br/rss/politica.xml', type: 'grande' },
  { name: 'UOL Notícias', rss: 'https://rss.uol.com.br/feed/noticias.xml', type: 'grande' },
  { name: 'G1 Política', rss: 'https://g1.globo.com/rss/g1/politica/', type: 'grande' },
  { name: 'Agência Câmara', rss: 'https://www.camara.leg.br/rss/noticias', type: 'oficial' },
  { name: 'Agência Senado', rss: 'https://www12.senado.leg.br/rss/noticias', type: 'oficial' },
  { name: 'Valor Econômico', rss: 'https://valor.globo.com/rss/politica', type: 'grande' },
  { name: 'The Intercept', rss: 'https://theintercept.com/brasil/feed/', type: 'alternativa' },
  { name: 'Nexo Jornal', rss: 'https://www.nexojornal.com.br/rss.xml', type: 'alternativa' },
  { name: 'Congresso em Foco', rss: 'https://congressoemfoco.uol.com.br/feed/', type: 'alternativa' },
  { name: 'Poder360', rss: 'https://www.poder360.com.br/feed/', type: 'alternativa' },
]

function NewsHeadline({title,source,date,imgSrc,url,big}:{title:string;source:string;date:string;imgSrc?:string;url?:string;big?:boolean}) {
  const [imgOk,setImgOk]=useState(false)  // starts false, set true on successful load
  const hasImg = imgSrc && imgOk
  
  return (
    <a href={url||'#'} target="_blank" rel="noopener noreferrer" style={{ display:'block',textDecoration:'none',borderBottom:'1px solid rgba(0,0,0,0.09)',paddingBottom:14,marginBottom:14 }}>
      {big && hasImg ? (
        <>
          <div style={{ height:170,borderRadius:13,overflow:'hidden',marginBottom:10,background:'rgba(0,0,0,0.1)' }}>
            <img src={imgSrc} alt="" onError={()=>setImgOk(false)} style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
          </div>
          <p style={{ fontSize:'clamp(13px,3.8vw,17px)',fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,lineHeight:1.3,marginBottom:5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as any }}>{title}</p>
        </>
      ) : big && !hasImg ? (
        <p style={{ fontSize:'clamp(16px,5vw,22px)',fontWeight:900,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,lineHeight:1.25,marginBottom:5 }}>{title}</p>
      ) : (
        <div style={{ display:'flex',gap:12,alignItems:'flex-start' }}>
          {hasImg && (<div style={{ width:68,height:68,borderRadius:9,overflow:'hidden',flexShrink:0,background:'rgba(0,0,0,0.1)' }}><img src={imgSrc} alt="" onError={()=>setImgOk(false)} style={{ width:'100%',height:'100%',objectFit:'cover' }}/></div>)}
          <p style={{ flex:1,fontSize:'clamp(11px,3vw,13px)',fontWeight:700,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,lineHeight:1.35,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any }}>{title}</p>
        </div>
      )}
      <div style={{ display:'flex',justifyContent:'space-between',marginTop:big?0:5 }}>
        <span style={{ fontSize:10,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK3,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em' }}>{source}</span>
        <span style={{ fontSize:10,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK3 }}>{date}</span>
      </div>
    </a>
  )
}

function C9({p}:{p:Parlamentar}) {
  const [newsItems, setNewsItems] = useState<{title:string;source:string;date:string;img?:string;url?:string;big?:boolean}[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true)
        setError(false)
        
        const params = new URLSearchParams({
          nome: p.nomeUrna,
          partido: p.partido,
        })
        
        const response = await fetch(`/api/news?${params}`)
        
        if (!response.ok) throw new Error('Falha ao buscar notícias')
        
        const data = await response.json()
        
        if (data.news && data.news.length > 0) {
          // Marca a primeira notícia como destaque (big)
          const newsWithBig = data.news.map((item: {title:string;source:string;date:string;img?:string;url?:string}, i: number) => ({
            ...item,
            big: i === 0,
          }))
          setNewsItems(newsWithBig)
        } else {
          setNewsItems([])
        }
      } catch (err) {
        console.error('Erro ao buscar notícias:', err)
        setError(true)
        setNewsItems([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchNews()
  }, [p.nomeUrna, p.partido])

  return (
    <div style={{ padding:'0 18px 32px' }}>
      <Lbl c="Cobertura da imprensa" style={{ marginBottom:5 }}/>
      <Big c={loading ? '...' : `${newsItems.length} manchetes`}/>
      <p style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginBottom:12 }}>de {NEWS_SOURCES.length} fontes monitoradas</p>
      {/* Fontes */}
      <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginBottom:16 }}>
        {NEWS_SOURCES.slice(0,8).map(s=>(
          <span key={s.name} style={{ fontSize:9,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",padding:'3px 0',color:INK }}>
            {s.type==='grande'?'':''}
            {s.type==='alternativa'?'':''}
            {s.type==='oficial'?'':''}
            {s.name}{' · '}
          </span>
        ))}
        <span style={{ fontSize:9,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",padding:'3px 0',color:INK }}>+{NEWS_SOURCES.length-8}</span>
      </div>
      {loading ? (
        <div style={{ textAlign:'center',padding:'40px 0' }}>
          <div style={{ width:24,height:24,border:'2px solid rgba(0,0,0,0.1)',borderTopColor:INK,borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto' }}/>
          <p style={{ fontSize:12,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginTop:12 }}>Buscando notícias em tempo real...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign:'center',padding:'30px 0',borderBottom:'1px solid rgba(0,0,0,0.12)',marginBottom:16 }}>
          <AlertTriangle size={20} color={INK} style={{ marginBottom:8 }} />
          <p style={{ fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,fontWeight:600 }}>Não foi possível carregar notícias</p>
          <p style={{ fontSize:11,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK,marginTop:4 }}>Tente novamente mais tarde</p>
        </div>
      ) : newsItems.length === 0 ? (
        <div style={{ textAlign:'center',padding:'30px 0',borderBottom:'1px solid rgba(0,0,0,0.12)',marginBottom:16 }}>
          <p style={{ fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:INK }}>Nenhuma notícia recente encontrada</p>
        </div>
      ) : (
        newsItems.map((item,i)=>(<NewsHeadline key={i} title={item.title} source={item.source} date={item.date} imgSrc={item.img} url={item.url} big={item.big}/>))
      )}
      <a href={`https://news.google.com/search?q=${encodeURIComponent(p.nomeUrna)}`} target="_blank" rel="noopener noreferrer" style={{ display:'flex',alignItems:'center',gap:5,fontSize:13,fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",fontWeight:700,color:INK,textDecoration:'none' }}>
        <ExternalLink size={13}/>Ver todas as notícias no Google News
      </a>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
