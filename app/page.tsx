'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { NetworkGraph, type ClusterMode, PARTY_COLORS } from '@/components/network-graph'
import { ParliamentarianProfile } from '@/components/parliamentarian-profile'
import { Logo } from '@/components/logo'
import { UFS, BANCADAS, FAIXAS_ETARIAS, RACAS, PATRIMONIO_LABELS, getAllParliamentariansAsync } from '@/lib/parliamentarians'
import type { Parlamentar } from '@/lib/parliamentarians'
import {
  Sun, Moon, Menu, X, Search, User, Info,
  Users, MapPin, Tag, TrendingUp, BarChart2, ChevronDown,
  Filter
} from 'lucide-react'
import Link from 'next/link'

type View = 'graph' | 'profile' | 'about' | 'user'

type Collection = {
  id: string
  name: string
  emoji: string
  color?: string
  parliamentarianIds: string[]
  createdAt: number
}

type SortMode = 'nome' | 'partido' | 'uf' | 'alinhamento' | 'patrimonio' | 'mandatos'

const CLUSTER_OPTIONS: { mode: ClusterMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { mode: 'partido',    label: 'Partido',      icon: <Users size={13} />,       desc: 'Agrupa pelos 18 partidos' },
  { mode: 'uf',         label: 'Estado',       icon: <MapPin size={13} />,      desc: 'Distribuição geográfica' },
  { mode: 'tema',       label: 'Tema',         icon: <Tag size={13} />,         desc: '8 macro temas legislativos' },
  { mode: 'alinhamento',label: 'Alinhamento',  icon: <TrendingUp size={13} />,  desc: 'Alinhamento com o governo' },
  { mode: 'tipo',       label: 'Casa',         icon: <BarChart2 size={13} />,   desc: 'Câmara vs Senado' },
  { mode: 'bancada',    label: 'Bancada',      icon: <Users size={13} />,       desc: 'Frentes parlamentares' },
  { mode: 'genero',     label: 'Gênero',       icon: <Users size={13} />,       desc: 'Homem · Mulher · Trans · Não-binárie' },
  { mode: 'faixaEtaria',label: 'Mandatos',     icon: <Users size={13} />,       desc: 'Tempo no poder' },
  { mode: 'raca',       label: 'Raça',         icon: <Users size={13} />,       desc: 'Autodeclaração racial' },
  { mode: 'patrimonio', label: 'Patrimônio',   icon: <TrendingUp size={13} />,  desc: 'Os mais ricos do Congresso' },
  { mode: 'projetos',  label: 'Projetos',     icon: <BarChart2 size={13} />,   desc: 'Quem mais aprovou projetos' },
]



// ── Saved parliamentarian card (needs own state for col picker)
function SavedCard({
  p, isDark, CARD, INK, MUT, BRD, BG, FONT, VIVID, collections,
  onRemove, onOpen, onToggleMember,
}: {
  p: Parlamentar
  isDark: boolean
  CARD: string; INK: string; MUT: string; BRD: string; BG: string; FONT: string
  VIVID: string[]
  collections: { id: string; name: string; emoji: string; color?: string; parliamentarianIds: string[] }[]
  onRemove: () => void
  onOpen: () => void
  onToggleMember: (colId: string, pId: string) => void
}) {
  const [showColPicker, setShowColPicker] = useState(false)
  const accent = VIVID[p.idNumerico % VIVID.length]
  const initials = p.nomeUrna.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
  const inCols = collections.filter(col => col.parliamentarianIds.includes(p.id))

  return (
    <div style={{ borderRadius:16,overflow:'hidden',background:CARD,border:`1px solid ${BRD}`,display:'flex',flexDirection:'column',position:'relative',height:'100%' }}>
      {/* Vivid color banner */}
      <div style={{ height:80,background:accent,position:'relative',cursor:'pointer',flexShrink:0 }}
        onClick={onOpen}>
        <div style={{ position:'absolute',bottom:-18,left:12,width:52,height:52,borderRadius:12,background:'#000',border:`3px solid ${CARD}`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center' }}>
          {p.urlFoto ? (
            <img src={p.urlFoto} alt={p.nomeUrna} style={{ width:'100%',height:'100%',objectFit:'cover' }}
              onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
          ) : (
            <span style={{ fontSize:18,fontWeight:900,color:'#fff' }}>{initials}</span>
          )}
        </div>
        <button onClick={e=>{e.stopPropagation();onRemove()}}
          style={{ position:'absolute',top:8,right:8,width:26,height:26,borderRadius:7,background:'rgba(0,0,0,0.25)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#000' }}>
          <X size={11} strokeWidth={2.5}/>
        </button>
      </div>
      {/* Info */}
      <div style={{ padding:'24px 12px 12px',flex:1,display:'flex',flexDirection:'column',gap:8 }}>
        <div>
          <p style={{ fontSize:13,fontWeight:900,color:INK,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.nomeUrna}</p>
          <p style={{ fontSize:10,color:MUT,margin:'2px 0 0' }}>{p.partido} · {p.uf} · {p.tipo==='SENADOR'?'Senador(a)':'Dep. Federal'}</p>
        </div>
        <div style={{ display:'flex',gap:6 }}>
          {[{l:'Mand.',v:p.mandatos},{l:'Freq.',v:`${Math.round(p.frequencia*100)}%`},{l:'Proc.',v:p.processos}].map(({l,v})=>(
            <div key={l} style={{ flex:1,padding:'5px 0',background:isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)',borderRadius:7,textAlign:'center' as const }}>
              <p style={{ fontSize:13,fontWeight:900,color:INK,margin:0 }}>{v}</p>
              <p style={{ fontSize:7,fontWeight:700,color:MUT,textTransform:'uppercase',letterSpacing:'0.06em',margin:0 }}>{l}</p>
            </div>
          ))}
        </div>
        {inCols.length > 0 && (
          <div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>
            {inCols.map(col=>(
              <span key={col.id} style={{ fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:99,background:`${col.color||'#3B82F6'}18`,color:col.color||'#3B82F6',display:'inline-flex',alignItems:'center',gap:3 }}>
                <div style={{ width:6,height:6,borderRadius:2,background:col.color||'#3B82F6' }}/>
                {col.name}
              </span>
            ))}
          </div>
        )}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginTop:'auto' }}>
          <div style={{ position:'relative' }}>
            <button onClick={()=>setShowColPicker(s=>!s)}
              style={{ width:'100%',padding:'7px 0',borderRadius:8,background:'transparent',border:`1px solid ${BRD}`,color:MUT,cursor:'pointer',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:4 }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Coleção
            </button>
            {showColPicker && collections.length > 0 && (
              <>
                <div style={{ position:'fixed',inset:0,zIndex:19 }} onClick={()=>setShowColPicker(false)}/>
                <div style={{ position:'absolute',bottom:'calc(100% + 4px)',left:0,right:0,zIndex:20,background:CARD,border:`1px solid ${BRD}`,borderRadius:10,padding:6,boxShadow:'0 8px 24px rgba(0,0,0,0.2)' }}>
                  {collections.map(col=>(
                    <button key={col.id} onClick={()=>{onToggleMember(col.id,p.id);setShowColPicker(false)}}
                      style={{ width:'100%',display:'flex',alignItems:'center',gap:7,padding:'7px 8px',background:col.parliamentarianIds.includes(p.id)?`${col.color||'#3B82F6'}12`:'transparent',border:'none',cursor:'pointer',borderRadius:7 }}>
                      <div style={{ width:10,height:10,borderRadius:3,background:col.color||'#3B82F6',flexShrink:0 }}/>
                      <span style={{ fontSize:11,color:INK,flex:1,textAlign:'left' as const }}>{col.name}</span>
                      {col.parliamentarianIds.includes(p.id) && (
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={col.color||'#3B82F6'} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={onOpen}
            style={{ padding:'7px 0',borderRadius:8,background:INK,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,color:BG,display:'flex',alignItems:'center',justifyContent:'center',gap:4 }}>
            Ver perfil
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Colorful shuffled pixel loading bar
const LOAD_PAL = ['#FF4D1C','#FFE135','#C8F752','#B8A9FF','#7FFFDA','#FFD166','#A0D8FF','#FFC2B4','#D4F5A0','#FF85C8','#FFBF69','#E9FF70','#C77DFF','#38BDF8','#F472B6','#34D399','#FACC15','#FB923C','#60A5FA','#EF4444']
function seededShuffle(arr: string[], seed: number) {
  const a = [...arr]
  let s = seed | 0
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function PixelLoadingBar({ isDark }: { isDark: boolean }) {
  const [progress, setProgress] = React.useState(0)
  const seed = React.useRef(Math.floor(Math.random() * 99999))
  const colors = React.useMemo(() => seededShuffle(LOAD_PAL, seed.current), [])

  React.useEffect(() => {
    const iv = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 0.06, 0.95))
    }, 80)
    return () => clearInterval(iv)
  }, [])
  const PIXEL = 10, GAP = 3, TOTAL = 32
  const filled = Math.round(progress * TOTAL)
  const inactiveColor = isDark ? '#1E293B' : '#E2E8F0'
  return (
    <div style={{ display: 'flex', gap: GAP }}>
      {Array.from({ length: TOTAL }, (_, i) => {
        const active = i < filled
        return (
          <div key={i} style={{
            width: PIXEL, height: PIXEL,
            background: active ? colors[i % colors.length] : inactiveColor,
            opacity: active ? 1 : 0.35,
            transition: active ? 'background 0.2s ease' : 'none',
          }} />
        )
      })}
    </div>
  )
}

export default function Home() {
  const [view, setView] = useState<View>('graph')
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [selectedParliamentarian, setSelectedParliamentarian] = useState<Parlamentar | null>(null)
  const [isDark, setIsDark] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  // Saved/dashboard state
  const [savedIds, setSavedIds]           = useState<string[]>([])
  const [collections, setCollections]     = useState<Collection[]>([])
  const [dashSort, setDashSort]           = useState<SortMode>('nome')
  const [activeCollection, setActiveColl] = useState<string | null>(null)  // null = todos
  const [allParls, setAllParls]           = useState<Parlamentar[]>([])
  // User dashboard local state (must be top-level hooks)
  const [newColName,  setNewColName]  = useState('')
  const [newColColor, setNewColColor] = useState('#3B82F6')
  const [editingCol,  setEditingCol]  = useState<string|null>(null)   // id of col being edited
  const [editColName, setEditColName] = useState('')
  const [editColColor,setEditColColor]= useState('')
  const [newColEmoji, setNewColEmoji] = useState('📌')
  const [addingCol,   setAddingCol]   = useState(false)
  const [addingToCol, setAddingToCol] = useState<{colId:string; pId:string}|null>(null)
  const [uiVisible, setUiVisible] = useState(true)
  const [showInitialAnimation, setShowInitialAnimation] = useState(true)
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [filterPartido, setFilterPartido] = useState('')
  const [filterUF, setFilterUF] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterBancada, setFilterBancada] = useState('')
  const [filterGenero, setFilterGenero] = useState('')
  const [filterFaixaEtaria, setFilterFaixaEtaria] = useState('')
  const [filterRaca, setFilterRaca] = useState('')
  const [filterPatrimonio, setFilterPatrimonio] = useState('')
  const [filterAlinhamento, setFilterAlinhamento] = useState('')
  const [clusterMode, setClusterMode] = useState<ClusterMode>('partido')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const hasActiveFilters = !!(search || filterPartido || filterUF || filterTipo || filterBancada || filterGenero || filterFaixaEtaria || filterRaca || filterPatrimonio || filterAlinhamento)

  const [parlamentaresLoaded, setParlamentaresLoaded] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addFilterPartido, setAddFilterPartido] = useState('')
  const [addFilterUF, setAddFilterUF] = useState('')
  const [addFilterTipo, setAddFilterTipo] = useState('')
  const filteredAddModal = React.useMemo(() => {
    return allParls.filter(p => {
      if (addFilterPartido && p.partido !== addFilterPartido) return false
      if (addFilterUF && p.uf !== addFilterUF) return false
      if (addFilterTipo && p.tipo !== addFilterTipo) return false
      if (addSearch) {
        const q = addSearch.toLowerCase().trim()
        if (q && !p.nomeUrna.toLowerCase().includes(q) && !p.nome.toLowerCase().includes(q) &&
            !p.partido.toLowerCase().includes(q) && !p.uf.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [allParls, addSearch, addFilterPartido, addFilterUF, addFilterTipo])

  const uniqueParties = React.useMemo(() => {
    const parties = new Set<string>()
    allParls.forEach(p => parties.add(p.partido))
    return Array.from(parties).sort()
  }, [allParls])

  useEffect(() => {
    const stored = localStorage.getItem('legi-viz-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored === 'dark' || (!stored && prefersDark)
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
    const userData = localStorage.getItem('legi-viz-user')
    if (userData) setUser(JSON.parse(userData))
    getAllParliamentariansAsync().then(async (parlamentares) => {
      console.debug('[DEBUG] Data loaded:', {
        total: parlamentares.length,
        byTipo: {
          DEPUTADO_FEDERAL: parlamentares.filter(p => p.tipo === 'DEPUTADO_FEDERAL').length,
          SENADOR: parlamentares.filter(p => p.tipo === 'SENADOR').length,
        },
        byPartido: parlamentares.reduce((acc, p) => {
          acc[p.partido] = (acc[p.partido] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        byGenero: parlamentares.reduce((acc, p) => {
          acc[p.genero] = (acc[p.genero] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        byRaca: parlamentares.reduce((acc, p) => {
          acc[p.raca] = (acc[p.raca] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      })
      
      let correctedData = [...parlamentares]
      let recommendedCluster = 'partido'
      
      try {
        const response = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: parlamentares,
            filters: {},
            clusterMode: 'partido',
            question: 'Analyze this Brazilian Congress data. Cross-validate that each parliamentarian has correct gender/race matching. Return ONLY a JSON object with corrections array and bestClusterMode. Format: { "corrections": [{ "id": "string", "field": "genero|raca|partido", "current": "string", "corrected": "string" }], "bestClusterMode": "partido|uf|tema|alinhamento|tipo|genero|faixaEtaria|raca|bancada|patrimonio|projetos" }'
          })
        })
        
        const claude = await response.json()
        console.debug('[Claude Analysis]', claude)
        
        if (claude.analysis?.corrections?.length > 0) {
          console.warn('[Claude Corrections]', claude.analysis.corrections)
          
          correctedData = parlamentares.map(p => {
            const correction = claude.analysis.corrections.find((c: { id: string }) => c.id === p.id)
            if (correction) {
              console.log(`[Applying Correction] ${p.nome}: ${correction.field} ${correction.current} -> ${correction.corrected}`)
              return { ...p, [correction.field]: correction.corrected }
            }
            return p
          })
        }
        
        if (claude.analysis?.bestClusterMode) {
          recommendedCluster = claude.analysis.bestClusterMode
          console.log(`[Claude Recommended] Cluster mode: ${recommendedCluster}`)
          setClusterMode(recommendedCluster as ClusterMode)
        }
      } catch (err) {
        console.warn('[Claude Error]', err)
      }

      setAllParls(correctedData)
      setParlamentaresLoaded(true)
      const saved: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith('legi-viz-saved-')) saved.push(k.replace('legi-viz-saved-', ''))
      }
      setSavedIds(saved)
      const colData = localStorage.getItem('legi-viz-collections')
      if (colData) { try { setCollections(JSON.parse(colData)) } catch {} }
      const openProfileId = sessionStorage.getItem('legi-viz-open-profile')
      if (openProfileId) {
        sessionStorage.removeItem('legi-viz-open-profile')
        const p = parlamentares.find(x => x.id === openProfileId)
        if (p) {
          setSelectedParliamentarian(p)
          setView('profile')
        }
      }
    })
  }, [])

  useEffect(() => {
    if (view !== 'graph') return
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 120 || menuOpen || filtersOpen) {
        setUiVisible(true)
        if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current)
      } else {
        if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current)
        uiTimeoutRef.current = setTimeout(() => {
          if (!menuOpen && !filtersOpen) setUiVisible(false)
        }, 4000)
      }
    }
    setUiVisible(true)
    window.addEventListener('mousemove', handleMouseMove)
    return () => { window.removeEventListener('mousemove', handleMouseMove); if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current) }
  }, [menuOpen, filtersOpen, view])

  // Global ESC handler — exits any open modal/view
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showAddModal)       { setShowAddModal(false); return }
      if (editingCol)         { setEditingCol(null);    return }
      if (addingCol)          { setAddingCol(false);    return }
      if (menuOpen)           { setMenuOpen(false);     return }
      if (view !== 'graph')   { setView('graph');       return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAddModal, editingCol, addingCol, menuOpen, view])

  const toggleTheme = useCallback(() => {
    const nd = !isDark
    setIsDark(nd)
    localStorage.setItem('legi-viz-theme', nd ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', nd)
  }, [isDark])

  const handleSelectParliamentarian = useCallback((p: Parlamentar) => {
    setSelectedParliamentarian(p)
    setView('profile')
  }, [])

  const handleBack = useCallback(() => { setView('graph'); setSelectedParliamentarian(null) }, [])
  // Track if we're returning from profile (to preserve cluster positions)
  const returningFromProfileRef = useRef(false)
  const [preserveGraphPositions, setPreserveGraphPositions] = useState(false)
  const handleBackFromProfile = useCallback(() => {
    returningFromProfileRef.current = true
    setPreserveGraphPositions(true)
    setView('graph')
    setSelectedParliamentarian(null)
    setTimeout(() => { 
      returningFromProfileRef.current = false
      // Keep preserve for slightly longer to ensure graph render happens
      setTimeout(() => setPreserveGraphPositions(false), 500)
    }, 100)
  }, [])

  // ── Saved / Collections helpers ───────────────────────────
  const persistCollections = (cols: Collection[]) => {
    setCollections(cols)
    localStorage.setItem('legi-viz-collections', JSON.stringify(cols))
  }

  const createCollection = (name: string, emoji: string, color: string) => {
    const col: Collection = { id: crypto.randomUUID(), name, emoji, color, parliamentarianIds: [], createdAt: Date.now() }
    persistCollections([...collections, col])
  }

  const deleteCollection = (id: string) => {
    persistCollections(collections.filter(c => c.id !== id))
    if (activeCollection === id) setActiveColl(null)
  }

  const renameCollection = (id: string, name: string, color: string) => {
    persistCollections(collections.map(c => c.id === id ? { ...c, name: name.trim() || c.name, color } : c))
  }

  const addToCollection = (colId: string, pId: string) => {
    persistCollections(collections.map(c =>
      c.id === colId && !c.parliamentarianIds.includes(pId)
        ? { ...c, parliamentarianIds: [...c.parliamentarianIds, pId] }
        : c
    ))
  }

  const removeFromCollection = (colId: string, pId: string) => {
    persistCollections(collections.map(c =>
      c.id === colId ? { ...c, parliamentarianIds: c.parliamentarianIds.filter(x => x !== pId) } : c
    ))
  }

  const unsaveParliamentarian = (pId: string) => {
    localStorage.removeItem(`legi-viz-saved-${pId}`)
    setSavedIds(prev => prev.filter(x => x !== pId))
    // Also remove from all collections
    persistCollections(collections.map(c => ({ ...c, parliamentarianIds: c.parliamentarianIds.filter(x => x !== pId) })))
  }

  const handleAnimationComplete = useCallback(() => {
    sessionStorage.setItem('legi-viz-animation-seen', 'true')
  }, [])

  const clearFilters = useCallback(() => {
    setSearch(''); setFilterPartido(''); setFilterUF(''); setFilterTipo('')
    setFilterBancada(''); setFilterGenero(''); setFilterFaixaEtaria(''); setFilterRaca(''); setFilterPatrimonio(''); setFilterAlinhamento('')
  }, [])


  if (view === 'user') {
    const savedParls = allParls.filter(p => savedIds.includes(p.id))
    // Filter for active collection
    const visibleParls = (() => {
      let list = activeCollection
        ? (collections.find(c => c.id === activeCollection)?.parliamentarianIds ?? [])
            .map(id => savedParls.find(p => p.id === id)).filter(Boolean) as Parlamentar[]
        : savedParls
      return [...list].sort((a, b) => {
        if (dashSort === 'nome')       return a.nomeUrna.localeCompare(b.nomeUrna)
        if (dashSort === 'partido')    return a.partido.localeCompare(b.partido)
        if (dashSort === 'uf')         return a.uf.localeCompare(b.uf)
        if (dashSort === 'alinhamento') return b.alinhamento - a.alinhamento
        if (dashSort === 'patrimonio')  return b.patrimonio - a.patrimonio
        if (dashSort === 'mandatos')    return b.mandatos - a.mandatos
        return 0
      })
    })()

    const BG   = isDark ? '#0A0A0A' : '#F4F4F0'
    const CARD = isDark ? '#141414' : '#FFFFFF'
    const INK  = isDark ? '#F0F0F0' : '#0B1220'
    const MUT  = isDark ? '#777' : '#666'
    const BRD  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
    const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

    // Vivid card accent colors — one per parlamentar (deterministic)
    const VIVID = ['#FF4D1C','#FFE135','#C8F752','#B8A9FF','#7FFFDA','#FFD166','#A0D8FF','#FFC2B4','#D4F5A0','#FF85C8','#FAEDCD','#CBF3F0','#FFBF69','#E9FF70','#C77DFF','#38BDF8','#F472B6','#34D399','#FACC15','#FB923C']
    const cardAccent = (p: Parlamentar) => VIVID[p.idNumerico % VIVID.length]

    const SORT_OPTS: {v: SortMode; l: string}[] = [
      {v:'nome',l:'A–Z'},{v:'partido',l:'Partido'},{v:'uf',l:'Estado'},
      {v:'alinhamento',l:'Alinhamento'},{v:'patrimonio',l:'Patrimônio'},{v:'mandatos',l:'Mandatos'},
    ]

    // Collection helper — toggle single member
    const toggleMember = (colId: string, pId: string) => {
      persistCollections(collections.map(col =>
        col.id === colId
          ? {
              ...col,
              parliamentarianIds: col.parliamentarianIds.includes(pId)
                ? col.parliamentarianIds.filter(x => x !== pId)
                : [...col.parliamentarianIds, pId]
            }
          : col
      ))
    }

    return (
      <div style={{ minHeight:'100dvh', background:BG, display:'flex', flexDirection:'column', fontFamily:FONT }}>
        {/* ── HEADER ── */}
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${BRD}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, backdropFilter:'blur(12px)', background:isDark?'rgba(10,10,10,0.9)':'rgba(244,244,240,0.9)', position:'sticky', top:0, zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={()=>setView('graph')} style={{ width:34,height:34,border:`1px solid ${BRD}`,borderRadius:9,background:'transparent',color:INK,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <X size={16} strokeWidth={2}/>
            </button>
            <div>
              <p style={{ fontSize:16,fontWeight:900,color:INK,margin:0 }}>Meu Painel</p>
              <p style={{ fontSize:10,color:MUT,margin:0 }}>{savedParls.length} parlamentares · {collections.length} coleções</p>
            </div>
          </div>
          <button
            onClick={()=>setShowAddModal(true)}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:9,border:`1px solid ${INK}`,background:'transparent',color:INK,cursor:'pointer',fontSize:11,fontWeight:700,letterSpacing:'0.04em' }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar parlamentar
          </button>
        </div>

        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          {/* ── SIDEBAR ── */}
          <div style={{ width:200, flexShrink:0, borderRight:`1px solid ${BRD}`, padding:'14px 0', overflowY:'auto', display:'flex', flexDirection:'column', gap:1 }}>
            <button onClick={()=>setActiveColl(null)}
              style={{ padding:'8px 14px',textAlign:'left',background:activeCollection===null?(isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)'):'transparent',border:'none',cursor:'pointer',color:INK,fontSize:12,fontWeight:activeCollection===null?800:500,display:'flex',alignItems:'center',gap:8,borderRadius:6,margin:'0 4px' }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span>Favoritos</span>
              <span style={{marginLeft:'auto',fontSize:10,color:MUT}}>{savedParls.length}</span>
            </button>

            {collections.length > 0 && (
              <p style={{ fontSize:8,fontWeight:700,color:MUT,textTransform:'uppercase',letterSpacing:'0.1em',padding:'10px 14px 3px' }}>Coleções</p>
            )}

            {collections.map(col => (
              <div key={col.id} style={{ display:'flex',alignItems:'center',margin:'0 4px',borderRadius:6,background:activeCollection===col.id?(isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)'):'transparent' }}>
                <button onClick={()=>setActiveColl(col.id)}
                  style={{ flex:1,padding:'8px 10px',textAlign:'left',background:'transparent',border:'none',cursor:'pointer',color:INK,fontSize:12,fontWeight:activeCollection===col.id?800:500,display:'flex',alignItems:'center',gap:7,minWidth:0 }}>
                  <div style={{ width:12,height:12,borderRadius:3,background:col.color||'#3B82F6',flexShrink:0 }}/>
                  <span style={{ flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{col.name}</span>
                  <span style={{ fontSize:10,color:MUT,flexShrink:0 }}>{col.parliamentarianIds.length}</span>
                </button>
                <button onClick={e=>{e.stopPropagation();setEditingCol(col.id);setEditColName(col.name);setEditColColor(col.color||'#3B82F6')}}
                  style={{ width:24,height:24,borderRadius:5,background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:MUT,marginRight:4 }}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            ))}

            <button onClick={()=>setAddingCol(true)}
              style={{ padding:'8px 14px',textAlign:'left',background:'transparent',border:'none',cursor:'pointer',color:MUT,fontSize:11,display:'flex',alignItems:'center',gap:7,marginTop:4 }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova coleção
            </button>

            {activeCollection && (
              <div style={{ marginTop:'auto',padding:'12px 10px 0' }}>
                <button onClick={()=>deleteCollection(activeCollection)} style={{ padding:'6px 10px',width:'100%',borderRadius:7,background:'transparent',border:`1px solid rgba(239,68,68,0.25)`,color:'#EF4444',cursor:'pointer',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:5 }}>
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  Excluir coleção
                </button>
              </div>
            )}
          </div>

          {/* ── MAIN CONTENT ── */}
          <div style={{ flex:1, overflowY:'auto', padding:20 }}>
            {/* Sort bar */}
            <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:16,flexWrap:'wrap' }}>
              <p style={{ fontSize:9,fontWeight:700,color:MUT,textTransform:'uppercase',letterSpacing:'0.1em',marginRight:2 }}>Ordenar:</p>
              {SORT_OPTS.map(o=>(
                <button key={o.v} onClick={()=>setDashSort(o.v)} style={{ padding:'4px 10px',borderRadius:99,border:`1px solid ${dashSort===o.v?INK:BRD}`,background:dashSort===o.v?INK:'transparent',color:dashSort===o.v?BG:MUT,fontSize:10,fontWeight:700,cursor:'pointer' }}>
                  {o.l}
                </button>
              ))}
            </div>

            {/* Empty state */}
            {visibleParls.length === 0 ? (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60%',gap:12,opacity:0.5 }}>
                <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <p style={{ fontSize:14,fontWeight:700,color:INK }}>{activeCollection ? 'Coleção vazia' : 'Nenhum parlamentar salvo'}</p>
                <p style={{ fontSize:11,color:MUT,textAlign:'center',maxWidth:240 }}>Salve parlamentares clicando no ❤ no perfil deles.</p>
                <button onClick={()=>{ setAddingCol(false); setView('graph') }} style={{ padding:'8px 18px',borderRadius:8,background:INK,color:BG,border:'none',cursor:'pointer',fontSize:11,fontWeight:700 }}>Explorar</button>
              </div>
            ) : (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gridAutoRows:'320px',gap:14 }}>
                {visibleParls.map(p => (
                  <SavedCard
                    key={p.id}
                    p={p}
                    isDark={isDark}
                    CARD={CARD} INK={INK} MUT={MUT} BRD={BRD} BG={BG} FONT={FONT}
                    VIVID={VIVID}
                    collections={collections}
                    onRemove={()=>unsaveParliamentarian(p.id)}
                    onOpen={()=>{ setSelectedParliamentarian(p); setView('profile') }}
                    onToggleMember={toggleMember}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ADD PARLIAMENTARIAN MODAL ── */}
        {showAddModal && filteredAddModal && (
            <div style={{ position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }} onClick={()=>setShowAddModal(false)}>
              <div style={{ background:CARD,borderRadius:20,width:'100%',maxWidth:520,maxHeight:'88vh',display:'flex',flexDirection:'column',border:`1px solid ${BRD}`,boxShadow:'0 32px 80px rgba(0,0,0,0.5)' }} onClick={e=>e.stopPropagation()}>
                {/* Modal header */}
                <div style={{ padding:'18px 20px 14px',borderBottom:`1px solid ${BRD}`,flexShrink:0 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                    <p style={{ fontSize:14,fontWeight:900,color:INK,margin:0 }}>Adicionar parlamentar</p>
                    <button onClick={()=>setShowAddModal(false)} style={{ background:'none',border:'none',cursor:'pointer',color:MUT }}><X size={16}/></button>
                  </div>
                  {/* Filters */}
                  <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                    <div style={{ position:'relative',flex:1,minWidth:140 }}>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="2" style={{ position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input value={addSearch} onChange={e=>setAddSearch(e.target.value)} placeholder="Buscar por nome..." style={{ width:'100%',padding:'7px 10px 7px 28px',borderRadius:8,border:`1px solid ${BRD}`,background:'transparent',color:INK,fontFamily:FONT,fontSize:11,outline:'none',boxSizing:'border-box' as const }}/>
                    </div>
                    <select value={addFilterPartido} onChange={e=>setAddFilterPartido(e.target.value)} style={{ padding:'7px 10px',borderRadius:8,border:`1px solid ${BRD}`,background:CARD,color:INK,fontFamily:FONT,fontSize:11,outline:'none' }}>
                      <option value="">Partido</option>
                      {uniqueParties.map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={addFilterUF} onChange={e=>setAddFilterUF(e.target.value)} style={{ padding:'7px 10px',borderRadius:8,border:`1px solid ${BRD}`,background:CARD,color:INK,fontFamily:FONT,fontSize:11,outline:'none' }}>
                      <option value="">Estado</option>
                      {UFS.map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                    <select value={addFilterTipo} onChange={e=>setAddFilterTipo(e.target.value)} style={{ padding:'7px 10px',borderRadius:8,border:`1px solid ${BRD}`,background:CARD,color:INK,fontFamily:FONT,fontSize:11,outline:'none' }}>
                      <option value="">Câmara/Senado</option>
                      <option value="DEPUTADO_FEDERAL">Câmara</option>
                      <option value="SENADOR">Senado</option>
                    </select>
                  </div>
                  <p style={{ fontSize:10,color:MUT,margin:'8px 0 0' }}>{filteredAddModal.length} parlamentares</p>
                </div>
                {/* List */}
                <div style={{ flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:6 }}>
                  {filteredAddModal.slice(0,80).map(p => {
                    const isSaved = savedIds.includes(p.id)
                    const accent = VIVID[p.idNumerico % VIVID.length]
                    const initials = p.nomeUrna.split(' ').map((w:string)=>w[0]).slice(0,2).join('')
                    return (
                      <div key={p.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:11,background:isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)',border:`1px solid ${isSaved?accent:BRD}`,transition:'border-color 0.2s' }}>
                        {/* Photo */}
                        <div style={{ width:38,height:38,borderRadius:9,background:accent,overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
                          {p.urlFoto ? (
                            <img src={p.urlFoto} alt={p.nomeUrna} style={{ width:'100%',height:'100%',objectFit:'cover' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                          ) : (
                            <span style={{ fontSize:14,fontWeight:900,color:'#000' }}>{initials}</span>
                          )}
                        </div>
                        {/* Info */}
                        <div style={{ flex:1,minWidth:0 }}>
                          <p style={{ fontSize:12,fontWeight:800,color:INK,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.nomeUrna}</p>
                          <p style={{ fontSize:9,color:MUT,margin:'1px 0 0' }}>{p.tipo==='SENADOR'?'Senador(a)':'Dep. Federal'} · {p.partido} · {p.uf}</p>
                        </div>
                        {/* Save toggle */}
                        <button onClick={()=>{
                          if (isSaved) {
                            localStorage.removeItem(`legi-viz-saved-${p.id}`)
                            setSavedIds(prev=>prev.filter(x=>x!==p.id))
                          } else {
                            localStorage.setItem(`legi-viz-saved-${p.id}`,'1')
                            setSavedIds(prev=>[...prev,p.id])
                          }
                        }} style={{ width:32,height:32,borderRadius:8,background:isSaved?accent:'transparent',border:`1px solid ${isSaved?accent:BRD}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s' }}>
                          {isSaved ? (
                            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : (
                            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          )}
                        </button>
                      </div>
                    )
                  })}
                  {filteredAddModal.length > 80 && <p style={{ fontSize:10,color:MUT,textAlign:'center',padding:8 }}>Use os filtros para refinar os resultados ({filteredAddModal.length} total)</p>}
                </div>
              </div>
            </div>
          )}

        {/* ── EDIT COLLECTION MODAL ── */}
        {editingCol && (
          <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={()=>setEditingCol(null)}>
            <div style={{ background:CARD,borderRadius:20,padding:28,maxWidth:360,width:'100%',border:`1px solid ${BRD}` }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
                <p style={{ fontSize:15,fontWeight:900,color:INK,margin:0 }}>Editar coleção</p>
                <button onClick={()=>setEditingCol(null)} style={{ background:'none',border:'none',cursor:'pointer',color:MUT }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <input value={editColName} onChange={e=>setEditColName(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'){renameCollection(editingCol,editColName,editColColor);setEditingCol(null)}}}
                autoFocus placeholder="Nome da coleção"
                style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:`1.5px solid ${BRD}`,background:'transparent',color:INK,fontFamily:FONT,fontSize:13,outline:'none',boxSizing:'border-box' as const,marginBottom:16 }}/>
              <p style={{ fontSize:10,fontWeight:700,color:MUT,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6 }}>Cor</p>
              <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:18 }}>
                {(['#3B82F6','#EF4444','#22C55E','#FACC15','#A855F7','#F97316','#EC4899','#14B8A6','#64748B','#FB923C','#C8F752','#38BDF8'] as string[]).map(sw=>(
                  <button key={sw} onClick={()=>setEditColColor(sw)} style={{ width:26,height:26,borderRadius:7,background:sw,border:editColColor===sw?`3px solid ${INK}`:'3px solid transparent',cursor:'pointer' }}/>
                ))}
              </div>
              <div style={{ display:'flex',gap:8 }}>
                <button onClick={()=>{renameCollection(editingCol,editColName,editColColor);setEditingCol(null)}}
                  style={{ flex:1,padding:'11px',borderRadius:10,background:INK,color:BG,fontSize:13,fontWeight:700,fontFamily:FONT,border:'none',cursor:'pointer' }}>
                  Salvar
                </button>
                <button onClick={()=>{deleteCollection(editingCol);setEditingCol(null)}}
                  style={{ padding:'11px 16px',borderRadius:10,background:'transparent',color:'#EF4444',fontSize:12,fontWeight:700,fontFamily:FONT,border:`1px solid rgba(239,68,68,0.3)`,cursor:'pointer' }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── NEW COLLECTION MODAL ── */}
        {addingCol && (
          <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={()=>setAddingCol(false)}>
            <div style={{ background:CARD,borderRadius:20,padding:28,maxWidth:380,width:'100%',border:`1px solid ${BRD}` }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
                <p style={{ fontSize:15,fontWeight:900,color:INK,margin:0 }}>Nova coleção</p>
                <button onClick={()=>setAddingCol(false)} style={{ background:'none',border:'none',cursor:'pointer',color:MUT }}><X size={16}/></button>
              </div>
              <input value={newColName} onChange={e=>setNewColName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newColName.trim()){createCollection(newColName.trim(),newColEmoji,newColColor);setNewColName('');setNewColEmoji('📌');setNewColColor('#3B82F6');setAddingCol(false)}}} autoFocus placeholder="Nome da coleção"
                style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:`1.5px solid ${BRD}`,background:'transparent',color:INK,fontFamily:FONT,fontSize:13,outline:'none',boxSizing:'border-box' as const,marginBottom:16 }}/>
              <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginBottom:18 }}>
                {['📌','⭐','🔍','💡','🗂️','🎯','📊','🏛️','⚡','🌱'].map(e=>(
                  <button key={e} onClick={()=>setNewColEmoji(e)} style={{ width:36,height:36,borderRadius:9,border:`2px solid ${newColEmoji===e?INK:BRD}`,background:'transparent',cursor:'pointer',fontSize:18 }}>{e}</button>
                ))}
              </div>
              <p style={{ fontSize:10,fontWeight:700,color:MUT,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6 }}>Cor</p>
              <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:16 }}>
                {(['#3B82F6','#EF4444','#22C55E','#FACC15','#A855F7','#F97316','#EC4899','#14B8A6','#64748B','#FB923C','#C8F752','#38BDF8'] as string[]).map(sw=>(
                  <button key={sw} onClick={()=>setNewColColor(sw)} style={{ width:26,height:26,borderRadius:7,background:sw,border:newColColor===sw?`3px solid ${INK}`:'3px solid transparent',cursor:'pointer',flexShrink:0 }}/>
                ))}
              </div>
              <button onClick={()=>{if(newColName.trim()){createCollection(newColName.trim(),newColEmoji,newColColor);setNewColName('');setNewColEmoji('📌');setNewColColor('#3B82F6');setAddingCol(false)}}}
                style={{ width:'100%',padding:'12px',borderRadius:10,background:INK,color:BG,fontSize:13,fontWeight:700,fontFamily:FONT,border:'none',cursor:'pointer' }}>
                Criar coleção
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }


  if (view === 'about') {
    return (
      <div className="min-h-screen overflow-auto" style={{ backgroundColor: isDark ? '#0A0A0A' : '#FAFAFA', color: isDark ? '#F8FAFC' : '#0F172A' }}>
        <header className="flex items-center gap-4 p-5 border-b" style={{ borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
          <button onClick={() => setView('graph')} className="p-2 rounded-lg hover:opacity-70 transition-opacity">
            <X className="w-5 h-5" />
          </button>
          <Logo className="h-5" isDark={isDark} />
          <div className="flex-1" />
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:opacity-70 transition-opacity">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
          <section>
            <h1 className="text-3xl font-bold mb-4 font-mono">Painel de Transparência Parlamentar</h1>
            <p className="text-lg leading-relaxed opacity-80">
              Plataforma pública que consolida, analisa e visualiza dados dos 594 parlamentares do
              Congresso Nacional — 513 Deputados Federais e 81 Senadores — em um único lugar de acesso livre.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 font-mono">Fontes de Dados</h2>
            <div className="space-y-2 opacity-80">
              {['API da Câmara dos Deputados · Votações, proposições, presença, despesas',
                'API do Senado Federal · Atividades legislativas dos senadores',
                'TSE Divulga Contas · Financiamento de campanha e bens declarados',
                'Portal da Transparência · Cota parlamentar e remunerações',
                'IA local (Ollama/Llama 3.1) · Classificação temática e sumários'].map((s, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <div className="w-1 h-1 rounded-full mt-2.5 shrink-0 bg-blue-500" />
                  <span className="text-sm">{s}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="p-5 rounded-xl" style={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }}>
            <h2 className="text-base font-bold mb-2 font-mono">Aviso Legal</h2>
            <p className="text-sm opacity-60 leading-relaxed">
              Informações compiladas de fontes públicas. Podem conter atrasos. Verifique dados críticos nas fontes originais.
              Esta plataforma não emite julgamentos de valor. Presunção de inocência garantida pela CF/88.
            </p>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen relative" style={{ backgroundColor: isDark ? '#0A0A0A' : '#FAFAFA', overflow: 'hidden' }}>

      {/* ──────── PIXEL LOADING SCREEN ──────── */}
      {!parlamentaresLoaded && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: isDark ? '#0A0A0A' : '#FAFAFA',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 28,
        }}>
          <div style={{ textAlign: 'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <Logo className="h-8" isDark={isDark} />
            <p style={{ fontSize: 10, fontFamily: "'Helvetica Neue',sans-serif", fontWeight: 600,
              color: isDark ? '#475569' : '#94A3B8', letterSpacing: '0.06em', margin: 0 }}>
              Congresso nacional monitorado
            </p>
          </div>
          {/* Pixel progress bar */}
          <PixelLoadingBar isDark={isDark} />
        </div>
      )}

      {/* ──────── NETWORK GRAPH ──────── */}
      <NetworkGraph
        key={`graph-${parlamentaresLoaded ? 'ready' : 'loading'}`}
        onSelectParliamentarian={handleSelectParliamentarian}
        searchQuery={search}
        filterPartido={filterPartido}
        filterUF={filterUF}
        filterTipo={filterTipo}
        filterBancada={filterBancada}
        filterGenero={filterGenero}
        filterFaixaEtaria={filterFaixaEtaria}
        filterRaca={filterRaca}
        filterPatrimonio={filterPatrimonio}
        filterAlinhamento={filterAlinhamento}
        clusterMode={clusterMode}
        isDark={isDark}
        showInitialAnimation={showInitialAnimation && animationsEnabled}
        onAnimationComplete={handleAnimationComplete}
        preservePositions={preserveGraphPositions}
        animationsEnabled={animationsEnabled}
      />

      {/* ──────── TOP BAR UNIFICADA ──────── */}
      <div
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{ opacity: uiVisible ? 1 : 0, transform: uiVisible ? 'translateY(0)' : 'translateY(-8px)', pointerEvents: uiVisible ? 'auto' : 'none' }}
      >
        {/* Barra principal */}
        <div
          className="mx-3 mt-3 rounded-2xl backdrop-blur-xl px-3 py-2 flex items-center gap-2"
          style={{
            backgroundColor: isDark ? 'rgba(10,10,10,0.92)' : 'rgba(250,250,250,0.95)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          }}
        >
          {/* Menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          {/* Logo - hidden on mobile */}
          <div className="shrink-0 mx-1 hidden sm:block">
            <Logo className="h-5" isDark={isDark} />
          </div>

          {/* Cluster mode buttons - desktop only */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <div className="w-px h-5 shrink-0 mx-1" style={{ backgroundColor: isDark ? '#1E293B' : '#CBD5E1' }} />
            {CLUSTER_OPTIONS.map(opt => (
              <button
                key={opt.mode}
                onClick={() => setClusterMode(opt.mode)}
                title={opt.desc}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium font-mono transition-all"
                style={clusterMode === opt.mode ? {
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                } : {
                  backgroundColor: 'transparent',
                  color: isDark ? '#64748B' : '#94A3B8',
                }}
              >
                {opt.icon}
                <span className="hidden lg:inline">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative min-w-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl font-mono outline-none bg-transparent"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                color: isDark ? '#F8FAFC' : '#0F172A',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                <X size={11} />
              </button>
            )}
          </div>

          {/* Filtros - botao separado com icone */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors relative"
            style={filtersOpen || hasActiveFilters ? {
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
            } : {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              color: isDark ? '#64748B' : '#94A3B8',
            }}
          >
            <Filter size={15} />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                {[filterPartido, filterUF, filterTipo, filterBancada, filterGenero, filterFaixaEtaria, filterRaca, filterPatrimonio].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {/* Painel de filtros expandido */}
        {filtersOpen && (
          <>
          {/* Backdrop para fechar ao clicar fora */}
          <div className="fixed inset-0" style={{ zIndex:50, backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', background:'rgba(0,0,0,0.40)' }} onClick={() => setFiltersOpen(false)} />
          <div
            className="mx-3 mt-1 rounded-2xl backdrop-blur-xl p-4"
            style={{
              position: 'relative', zIndex: 51,
              backgroundColor: isDark ? 'rgba(10,10,10,0.97)' : 'rgba(250,250,250,0.98)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header com titulo e botao fechar */}
            <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
              <span className="text-sm font-mono font-semibold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>Filtros</span>
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Cluster mode - mobile only */}
            <div className="md:hidden mb-4">
              <span className="text-xs font-mono opacity-50 block mb-2">Agrupar por</span>
              <div className="flex flex-wrap gap-1.5">
                {CLUSTER_OPTIONS.map(opt => (
                  <button
                    key={opt.mode}
                    onClick={() => setClusterMode(opt.mode)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium font-mono transition-all"
                    style={clusterMode === opt.mode ? {
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                    } : {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                      color: isDark ? '#FFFFFF' : '#64748B',
                    }}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))", gap:"12px 16px", alignItems:"start" }}>
              {/* Partido */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Partido</span>
                <select
                  value={filterPartido}
                  onChange={e => setFilterPartido(e.target.value)}
                  className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                    color: filterPartido ? PARTY_COLORS[filterPartido] || (isDark ? '#FFFFFF' : '#0F172A') : (isDark ? '#FFFFFF' : '#64748B'),
                    border: `1px solid ${filterPartido ? PARTY_COLORS[filterPartido] || '#3B82F6' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                    minWidth: '110px',
                  }}
                >
                  <option value="">Todos</option>
                  {uniqueParties.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Estado */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Estado</span>
                <select
                  value={filterUF}
                  onChange={e => setFilterUF(e.target.value)}
                  className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                    color: isDark ? '#FFFFFF' : '#64748B',
                    border: `1px solid ${filterUF ? '#3B82F6' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                    minWidth: '80px',
                  }}
                >
                  <option value="">Todos</option>
                  {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Casa */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Casa</span>
                <div className="flex gap-1">
                  {[{ v: '', l: 'Todos' }, { v: 'DEPUTADO_FEDERAL', l: 'Câmara' }, { v: 'SENADOR', l: 'Senado' }].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setFilterTipo(opt.v)}
                      className="text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all"
                      style={filterTipo === opt.v ? {
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                      } : {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        color: isDark ? '#FFFFFF' : '#64748B',
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alinhamento */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Alinhamento</span>
                <div className="flex gap-1 flex-wrap">
                  {[
                    { v: '', l: 'Todos' },
                    { v: '0', l: 'Oposição', c: '#EF4444' },
                    { v: '25', l: 'Neutro', c: '#FACC15' },
                    { v: '50', l: 'Alinhado', c: '#3B82F6' },
                    { v: '75', l: 'Gov', c: '#22C55E' },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setFilterAlinhamento(opt.v)}
                      className="text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all"
                      style={filterAlinhamento === opt.v ? {
                        backgroundColor: opt.c || '#3B82F6',
                        color: '#FFFFFF',
                      } : {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        color: isDark ? '#FFFFFF' : '#64748B',
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bancada */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Bancada</span>
                <select
                  value={filterBancada}
                  onChange={e => setFilterBancada(e.target.value)}
                  className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                    color: isDark ? '#FFFFFF' : '#64748B',
                    border: `1px solid ${filterBancada ? '#3B82F6' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                    minWidth: '100px',
                  }}
                >
                  <option value="">Todas</option>
                  {BANCADAS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Genero */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Gênero</span>
                <div className="flex gap-1 flex-wrap">
                  {[
                    { v: '',           l: 'Todos',        c: '#3B82F6' },
                    { v: 'Homem',      l: 'Homem',        c: '#3B82F6' },
                    { v: 'Mulher',     l: 'Mulher',       c: '#EC4899' },
                    { v: 'Trans',      l: 'Trans',        c: '#A855F7' },
                    { v: 'NaoBinarie', l: 'Não-binárie',  c: '#F97316' },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setFilterGenero(opt.v)}
                      className="text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all"
                      style={filterGenero === opt.v ? {
                        backgroundColor: opt.c,
                        color: '#FFFFFF',
                      } : {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        color: isDark ? '#FFFFFF' : '#64748B',
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Faixa Etaria */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Idade</span>
                <select
                  value={filterFaixaEtaria}
                  onChange={e => setFilterFaixaEtaria(e.target.value)}
                  className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                    color: isDark ? '#FFFFFF' : '#64748B',
                    border: `1px solid ${filterFaixaEtaria ? '#3B82F6' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                    minWidth: '80px',
                  }}
                >
                  <option value="">Todas</option>
                  {FAIXAS_ETARIAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Raca */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Raça</span>
                <select
                  value={filterRaca}
                  onChange={e => setFilterRaca(e.target.value)}
                  className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                    color: isDark ? '#FFFFFF' : '#64748B',
                    border: `1px solid ${filterRaca ? '#3B82F6' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                    minWidth: '90px',
                  }}
                >
                  <option value="">Todas</option>
                  {RACAS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Patrimônio */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>💰 Patrimônio</span>
                <select
                  value={filterPatrimonio}
                  onChange={e => setFilterPatrimonio(e.target.value)}
                  className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                    color: filterPatrimonio ? '#F97316' : (isDark ? '#FFFFFF' : '#64748B'),
                    border: `1px solid ${filterPatrimonio ? '#F97316' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                    minWidth: '110px',
                  }}
                >
                  <option value="">Todos</option>
                  {PATRIMONIO_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Limpar */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all ml-auto"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.12)',
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <X size={11} />
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
          </>
        )}
      </div>

      {/* ──────── SIDEBAR MENU ──────── */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            className="fixed top-0 left-0 h-full w-72 z-50 p-6 pt-16"
            style={{
              backgroundColor: isDark ? 'rgba(10,10,10,0.97)' : 'rgba(250,250,250,0.97)',
              backdropFilter: 'blur(24px)',
              borderRight: `1px solid ${isDark ? '#262626' : '#E5E5E5'}`,
            }}
          >
            <button onClick={() => setMenuOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg opacity-50 hover:opacity-100">
              <X size={18} />
            </button>

            <Logo className="h-5 mb-8" isDark={isDark} />

            <div className="space-y-1 mb-6">
              {user ? (
                <button onClick={() => { setView('user'); setMenuOpen(false) }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors w-full text-left"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: 'none', cursor: 'pointer', color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  <User size={16} className="opacity-60" />
                  <div>
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="text-xs opacity-40">Meus parlamentares</div>
                  </div>
                </button>
              ) : (
                <button onClick={() => { setView('user'); setMenuOpen(false) }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors w-full text-left"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: 'none', cursor: 'pointer', color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  <User size={16} className="opacity-60" />
                  <span className="text-sm">Meu Painel</span>
                </button>
              )}
            </div>

            <div className="space-y-1">
              <button
                onClick={() => { setView('graph'); setMenuOpen(false) }}
                className="w-full text-left px-3 py-3 rounded-xl text-sm transition-colors"
                style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.08)', color: '#3B82F6' }}
              >
                Rede de Parlamentares
              </button>
              <button
                onClick={() => { setView('about'); setMenuOpen(false) }}
                className="w-full text-left px-3 py-3 rounded-xl text-sm transition-colors opacity-70 hover:opacity-100"
              >
                Sobre o Projeto
              </button>
            </div>

            <div className="absolute bottom-6 left-6 right-6">
              <div className="text-xs opacity-30 font-mono">Painel de Transparência Parlamentar · 2025</div>
            </div>
          </div>
        </>
      )}

      {/* ──────── USER DASHBOARD ──────── */}
      <button
        onClick={() => setView('user')}
        className="fixed bottom-4 right-14 z-30 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          opacity: uiVisible ? 1 : 0,
          pointerEvents: uiVisible ? 'auto' : 'none',
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
          position:'fixed',
        }}
      >
        {savedIds.length > 0 && (
          <span style={{ position:'absolute',top:-4,right:-4,width:16,height:16,borderRadius:99,background:'#EF4444',fontSize:9,fontWeight:700,color:'#FFF',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Helvetica Neue',sans-serif" }}>
            {savedIds.length > 9 ? '9+' : savedIds.length}
          </span>
        )}
        <User size={14} className="opacity-60" />
      </button>

      {/* ──────── HELP ──────── */}
      <button
        onClick={() => setView('about')}
        className="fixed bottom-4 right-4 z-30 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          opacity: uiVisible ? 1 : 0,
          pointerEvents: uiVisible ? 'auto' : 'none',
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
        }}
      >
        <Info size={14} className="opacity-60" />
      </button>

      {/* ──────── ANIMATION SWITCH — fixed bottom-right, always visible ──────── */}
      <button
        onClick={() => setAnimationsEnabled(a => !a)}
        title={animationsEnabled ? 'Desativar animações' : 'Ativar animações'}
        className="fixed z-50 flex items-center gap-2 transition-all duration-200"
        style={{
          bottom: 64,
          right: 12,
          padding: '5px 10px 5px 8px',
          borderRadius: 20,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
          backgroundColor: isDark ? 'rgba(10,10,10,0.88)' : 'rgba(250,250,250,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          cursor: 'pointer',
          color: isDark ? '#F8FAFC' : '#0F172A',
        }}
      >
        {/* Mini toggle track */}
        <div style={{
          width: 28, height: 16, borderRadius: 8,
          background: animationsEnabled ? '#22C55E' : (isDark ? '#374151' : '#D1D5DB'),
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', top: 2, width: 12, height: 12, borderRadius: '50%',
            background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'left 0.2s',
            left: animationsEnabled ? 14 : 2,
          }}/>
        </div>
        <span style={{ fontSize: 10, fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          ANIM
        </span>
      </button>

      {/* ──────── PROFILE MODAL (desktop: card over graph) ──────── */}
      {view === 'profile' && selectedParliamentarian && (
        <>
          {/* backdrop blur */}
          <div
            className="fixed inset-0 z-50"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={handleBackFromProfile}
          />
          {/* card */}
          <div
            className="fixed z-50"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(420px, calc(100vw - 32px))',
              maxHeight: 'calc(100vh - 48px)',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ParliamentarianProfile
              parlamentar={selectedParliamentarian}
              onBack={handleBackFromProfile}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              onSaveToggle={(id, saved) => {
                setSavedIds(prev => saved ? (prev.includes(id)?prev:[...prev,id]) : prev.filter(x=>x!==id))
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
