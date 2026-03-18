'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { 
  getAllParliamentarians, 
  congressLayout,
  domesLayout,
  PARTIDOS,
  UFS,
  TEMAS,
  GENEROS,
  FAIXAS_ETARIAS,
  RACAS,
  BANCADAS,
  PATRIMONIO_LABELS,
  patrimonioLabel,
  GENERO_COLORS,
  FAIXA_ETARIA_COLORS,
  RACA_COLORS,
  BANCADA_COLORS,
  type Parlamentar,
  type Genero,
  type FaixaEtaria,
  type Raca,
  type Bancada,
} from '@/lib/parliamentarians'

export type ClusterMode = 'partido' | 'uf' | 'tema' | 'tipo' | 'genero' | 'faixaEtaria' | 'raca' | 'bancada' | 'patrimonio' | 'cotas'

export const PARTY_COLORS: Record<string, string> = {
  PL:            '#22C55E',
  PT:            '#EF4444',
  UNIÃO:         '#3B82F6',
  PSD:           '#F97316',
  MDB:           '#FACC15',
  PP:            '#14B8A6',
  REPUBLICANOS:  '#A855F7',
  PDT:           '#EC4899',
  PSDB:          '#06B6D4',
  PODE:          '#84CC16',
  AVANTE:        '#F43F5E',
  SOLIDARIEDADE: '#8B5CF6',
  PSB:           '#FB923C',
  PCdoB:         '#DC2626',
  CIDADANIA:     '#0EA5E9',
  PSOL:          '#C026D3',
  PV:            '#16A34A',
  NOVO:          '#FBBF24',
  PRD:           '#64748B',
  AGIR:          '#0D9488',
  DC:            '#7C3AED',
  REDE:          '#10B981',
  'S.PART.':     '#6366F1',
  'PARTIDO(':     '#94A3B8',
  'FEDERAÇÃO':    '#F472B6',
  PCO:           '#EF4444',
  UP:            '#DC2626',
  PATRIOTA:      '#F59E0B',
  PMB:           '#EC4899',
}

const UF_COLORS: Record<string, string> = {
  AC: '#10B981', AM: '#059669', AP: '#047857', PA: '#34D399', RO: '#6EE7B7', RR: '#A7F3D0', TO: '#D1FAE5',
  AL: '#F97316', BA: '#EA580C', CE: '#FB923C', MA: '#FACC15', PB: '#FCD34D', PE: '#FBBF24', PI: '#F59E0B', RN: '#D97706', SE: '#B45309',
  DF: '#A855F7', GO: '#9333EA', MS: '#7C3AED', MT: '#8B5CF6',
  ES: '#0EA5E9', MG: '#3B82F6', RJ: '#60A5FA', SP: '#1D4ED8',
  PR: '#EC4899', RS: '#DB2777', SC: '#F472B6',
}

const TEMA_COLORS: Record<string, string> = {
  'Saude':         '#22C55E',
  'Seguranca':     '#EF4444',
  'Agro':          '#84CC16',
  'Educacao':      '#FACC15',
  'Economia':      '#3B82F6',
  'Meio Ambiente': '#14B8A6',
  'Infraestrutura':'#F97316',
  'Direitos':      '#EC4899',
}

const TEMAS_FULL = ['Saude', 'Seguranca', 'Agro', 'Educacao', 'Economia', 'Meio Ambiente', 'Infraestrutura', 'Direitos']

const PATRIMONIO_COLORS = ['#94A3B8','#38BDF8','#818CF8','#F97316','#EF4444','#DC2626'] as const

// Blend colors from multiple bancadas for Venn diagram
function blendBancadaColors(bancadas: string[]): string {
  if (bancadas.length === 0) return '#94A3B8' // Gray for none
  if (bancadas.length === 1) return BANCADA_COLORS[bancadas[0] as keyof typeof BANCADA_COLORS] || '#94A3B8'
  
  // Blend colors
  const colors = bancadas.map(b => BANCADA_COLORS[b as keyof typeof BANCADA_COLORS] || '#94A3B8')
  
  // Parse and blend RGB values
  const rgbValues = colors.map(c => {
    const hex = c.replace('#', '')
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    }
  })
  
  const blended = rgbValues.reduce((acc, rgb) => ({
    r: acc.r + rgb.r,
    g: acc.g + rgb.g,
    b: acc.b + rgb.b,
  }), { r: 0, g: 0, b: 0 })
  
  const count = rgbValues.length
  const r = Math.round(blended.r / count)
  const g = Math.round(blended.g / count)
  const b = Math.round(blended.b / count)
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Generate consistent color from party name (always returns hex)
function partyColor(p: string): string {
  if (PARTY_COLORS[p]) return PARTY_COLORS[p]
  // Generate fallback color from hash (convert HSL to hex)
  let hash = 0
  for (let i = 0; i < p.length; i++) hash = ((hash << 5) - hash) + p.charCodeAt(i)
  const h = Math.abs(hash) % 360
  const s = 60, l = 50
  const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l / 100 - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

function getNodeColor(node: Parlamentar, mode: ClusterMode): string {
  if (mode === 'partido') return partyColor(node.partido)
  if (mode === 'uf')      return UF_COLORS[node.uf] || '#64748B'
  if (mode === 'tema')    return TEMA_COLORS[node.macroTema] || '#64748B'
  if (mode === 'tipo')    return node.tipo === 'SENADOR' ? '#34D399' : '#818CF8'
  if (mode === 'genero')  return GENERO_COLORS[node.genero] || '#64748B'
  if (mode === 'faixaEtaria') {
    const PAL: Record<string,string> = {'1 mandato':'#38BDF8','2-3 mandatos':'#818CF8','4-5 mandatos':'#A78BFA','6+ mandatos':'#E879F9'}
    return PAL[node.faixaEtaria] || '#64748B'
  }
  if (mode === 'raca')       return RACA_COLORS[node.raca] || '#64748B'
  if (mode === 'bancada') {
    const bancadas = (node as any).bancadas || [node.bancada]
    const valid = bancadas.filter((b: string) => b && b !== 'Nenhuma')
    const primary = valid[0] || 'Nenhuma'
    return BANCADA_COLORS[primary as keyof typeof BANCADA_COLORS] || '#94A3B8'
  }
  if (mode === 'patrimonio') return PATRIMONIO_COLORS[PATRIMONIO_LABELS.indexOf(patrimonioLabel(node.patrimonio) as typeof PATRIMONIO_LABELS[number])] || '#64748B'
  if (mode === 'cotas') {
    const cotas = (node as any).cotas ?? 0
    const cotasTotal = (node as any).cotasTotal ?? 0
    // Consider both number of records AND total amount
    const hasDespesas = cotas > 0 || cotasTotal > 0
    if (!hasDespesas) return '#22C55E'  // Green - no expenses
    if (cotas >= 600) return '#EF4444'  // Red - most
    if (cotas >= 400) return '#F97316'  // Orange
    if (cotas >= 200) return '#FACC15'  // Yellow
    return '#22C55E'  // Green - least
  }
  const t = node.alinhamento / 100
  const r = Math.round(239 + (34 - 239) * t)
  const g = Math.round(68  + (197 - 68)  * t)
  const b = Math.round(68  + (94 - 68)   * t)
  return `rgb(${r},${g},${b})`
}

function getClusterKey(node: Parlamentar, mode: ClusterMode): string {
  if (mode === 'partido') {
    const p = node.partido
    if (!p || p === '' || p === 'SEM PARTIDO') return 'S.PART.'
    return p
  }
  if (mode === 'uf')          return node.uf
  if (mode === 'tema')        return node.macroTema
  if (mode === 'tipo')        return node.tipo === 'SENADOR' ? 'Senadores' : 'Deputados'
  if (mode === 'genero') {
    const g = node.genero
    if (g === 'Homem') return 'Homem Cis'
    if (g === 'Mulher') return 'Mulher Cis'
    if (g === 'Trans') return 'Mulher Trans'
    if (g === 'NaoBinarie') return 'Não-binárie'
    return g
  }
  if (mode === 'faixaEtaria') return node.faixaEtaria
  if (mode === 'raca')        return node.raca
  if (mode === 'bancada') {
    const bancadas = (node as any).bancadas || [node.bancada]
    const valid = bancadas.filter((b: string) => b && b !== 'Nenhuma')
    return valid[0] || 'Nenhuma'
  }
  if (mode === 'patrimonio')  return patrimonioLabel(node.patrimonio)
  if (mode === 'cotas') {
    const cotas = (node as any).cotas ?? 0
    const cotasTotal = (node as any).cotasTotal ?? 0
    // Consider both number of records AND total amount
    const hasDespesas = cotas > 0 || cotasTotal > 0
    if (!hasDespesas) return 'Sem despesas'
    if (cotas >= 600) return '600+ despesas'
    if (cotas >= 400) return '400-599'
    if (cotas >= 200) return '200-399'
    return '1-199'
  }
  const bucket = Math.floor(node.alinhamento / 25)
  const labels = ['Oposicao (0-24%)', 'Neutro (25-49%)', 'Alinhado (50-74%)', 'Governo (75-100%)']
  return labels[Math.min(bucket, 3)]
}

function computeClusterCenters(
  mode: ClusterMode,
  W: number,
  H: number,
  counts?: Map<string, number>,   // optional — used for repulsion
): Map<string, {x: number, y: number}> {
  const map = new Map<string, {x: number, y: number}>()
  const isMobile = W < 600
  const pad = isMobile ? 70 : 110

  if (mode === 'partido') {
    // Get ALL parties with at least 1 member
    const countsMap = counts ?? new Map<string, number>()
    const allKeys = [...countsMap.keys()].filter(k => (countsMap.get(k) ?? 0) > 0)
    const sorted = allKeys.sort((a, b) => (countsMap.get(b) ?? 0) - (countsMap.get(a) ?? 0))
    // Use 6 cols with more rows for breathing room
    const cols = 6
    const rows = Math.ceil(sorted.length / cols) + 1  // Extra row for spacing
    const cw = (W - pad * 2) / cols
    const ch = (H - pad * 2) / rows
    sorted.forEach((k, i) => {
      map.set(k, {
        x: pad + (i % cols) * cw + cw / 2,
        y: pad + Math.floor(i / cols) * ch + ch / 2,
      })
    })
  } else if (mode === 'uf') {
    const geoPos: Record<string, [number, number]> = {
      RR: [0.24, 0.06], AP: [0.38, 0.09], AM: [0.17, 0.18], PA: [0.36, 0.19], MA: [0.52, 0.18],
      AC: [0.10, 0.28], RO: [0.19, 0.31], TO: [0.43, 0.30], PI: [0.55, 0.29], CE: [0.66, 0.20],
      RN: [0.73, 0.24], PB: [0.71, 0.30], PE: [0.68, 0.35], AL: [0.69, 0.41], SE: [0.67, 0.46],
      MT: [0.29, 0.41], GO: [0.38, 0.49], DF: [0.41, 0.53], BA: [0.57, 0.46],
      MS: [0.30, 0.58], MG: [0.48, 0.59], ES: [0.59, 0.58], RJ: [0.55, 0.67],
      SP: [0.44, 0.69], PR: [0.39, 0.77], SC: [0.39, 0.84], RS: [0.37, 0.92],
    }
    UFS.forEach((uf) => {
      const pos = geoPos[uf] || [0.5, 0.5]
      map.set(uf, {
        x: pad * 0.5 + pos[0] * (W - pad),
        y: pad * 0.3 + pos[1] * (H - pad * 0.6),
      })
    })
  } else if (mode === 'tema') {
    const keys = TEMAS_FULL
    const r = Math.min(W, H) * (isMobile ? 0.28 : 0.32)
    keys.forEach((k, i) => {
      const angle = (i / keys.length) * Math.PI * 2 - Math.PI / 2
      map.set(k, { x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r })
    })
  } else if (mode === 'tipo') {
    map.set('Senadores', { x: W * 0.25, y: H / 2 })
    map.set('Deputados', { x: W * 0.72, y: H / 2 })
  } else if (mode === 'genero') {
    const isMob = W < 600
    const positions = [
      { key: 'Homem Cis',      x: W * 0.18, y: H / 2 },
      { key: 'Mulher Cis',     x: W * 0.42, y: H / 2 },
      { key: 'Mulher Trans',  x: W * 0.66, y: H / 2 },
      { key: 'Não-binárie',    x: W * 0.88, y: H / 2 },
    ]
    if (isMob) {
      // mobile: 2x2 grid
      positions[0] = { key: 'Homem Cis',      x: W * 0.28, y: H * 0.35 }
      positions[1] = { key: 'Mulher Cis',     x: W * 0.72, y: H * 0.35 }
      positions[2] = { key: 'Mulher Trans',  x: W * 0.28, y: H * 0.65 }
      positions[3] = { key: 'Não-binárie',    x: W * 0.72, y: H * 0.65 }
    }
    positions.forEach(p => map.set(p.key, { x: p.x, y: p.y }))
  } else if (mode === 'faixaEtaria') {
    FAIXAS_ETARIAS.forEach((k, i) => {
      map.set(k, { x: pad + (i / (FAIXAS_ETARIAS.length - 1)) * (W - pad * 2), y: H / 2 })
    })
  } else if (mode === 'raca') {
    // Much larger radius to prevent cluster overlap - Branco is very large (~340), Pardo (~220), Preto (~60)
    const r = Math.min(W, H) * (isMobile ? 0.42 : 0.48)
    RACAS.forEach((k, i) => {
      const angle = (i / RACAS.length) * Math.PI * 2 - Math.PI / 2
      map.set(k, { x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r })
    })
  } else if (mode === 'bancada') {
    // Grid layout for each bancada including "Nenhuma"
    const cols = 3
    const rows = Math.ceil(BANCADAS.length / cols)
    const cw = (W - pad * 2) / cols
    const ch = (H - pad * 2) / rows
    
    BANCADAS.forEach((k, i) => {
      map.set(k, { x: pad + (i % cols) * cw + cw / 2, y: pad + Math.floor(i / cols) * ch + ch / 2 })
    })
  } else if (mode === 'patrimonio') {
    PATRIMONIO_LABELS.forEach((k, i) => {
      map.set(k, { x: pad + (i / (PATRIMONIO_LABELS.length - 1)) * (W - pad * 2), y: H / 2 })
    })
  } else if (mode === 'cotas') {
    // Horizontal bar layout
    const keys = ['600+ despesas', '400-599', '200-399', '1-199', 'Sem despesas']
    keys.forEach((k, i) => {
      map.set(k, { x: pad + (i / (keys.length - 1)) * (W - pad * 2), y: H / 2 })
    })
  }

  // Repulsion pass — guarantees minimum gap between cluster bounding circles
  // Skip repulsion for UF, raca, and genero modes to preserve layout shapes
  if (counts && mode !== 'uf' && mode !== 'raca' && mode !== 'genero') repelClusters(map, counts, W, H, mode)

  return map
}

/** Approximate radius that a cluster of `count` nodes will occupy */
function clusterRadius(count: number, mode?: ClusterMode): number {
  if (count <= 1) return 16
  const isUF = mode === 'uf'
  const isRacaMode = mode === 'raca'
  const isGenero = mode === 'genero'
  // Use same spacing as buildClusterPositions
  const spacing = isUF ? 12 : isRacaMode ? 20 : isGenero ? 18 : 16
  // Circle packing: area = count * spacing^2, radius = sqrt(area/PI)
  const area = count * spacing * spacing
  return Math.sqrt(area / Math.PI) + spacing * 1.5
}

/** Iterative spring-repulsion — pushes overlapping cluster centers apart */
function repelClusters(
  centers: Map<string, {x: number, y: number}>,
  counts:  Map<string, number>,
  W: number,
  H: number,
  mode?: ClusterMode,
  MIN_GAP = 30,
  ITERS   = 80,
): void {
  const keys = [...centers.keys()]
  if (keys.length < 2) return
  for (let iter = 0; iter < ITERS; iter++) {
    let moved = false
    for (let a = 0; a < keys.length; a++) {
      for (let b = a + 1; b < keys.length; b++) {
        const ca = centers.get(keys[a])!
        const cb = centers.get(keys[b])!
        const ra = clusterRadius(counts.get(keys[a]) ?? 1, mode)
        const rb = clusterRadius(counts.get(keys[b]) ?? 1, mode)
        const minDist = ra + rb + MIN_GAP
        const dx = cb.x - ca.x, dy = cb.y - ca.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
        if (dist < minDist) {
          const push = (minDist - dist) * 0.5
          const nx = dx / dist, ny = dy / dist
          ca.x -= nx * push; ca.y -= ny * push
          cb.x += nx * push; cb.y += ny * push
          moved = true
        }
      }
    }
    // Clamp inside viewport
    const PAD = 55
    for (const key of keys) {
      const c = centers.get(key)!
      const r = clusterRadius(counts.get(key) ?? 1, mode)
      c.x = Math.max(PAD + r, Math.min(W - PAD - r, c.x))
      c.y = Math.max(PAD + r, Math.min(H - PAD - r, c.y))
    }
    if (!moved) break
  }
}

function buildClusterPositions(count: number, cx: number, cy: number, mode?: ClusterMode): {x: number, y: number}[] {
  const positions: {x: number, y: number}[] = []
  if (count === 0) return positions
  if (count === 1) return [{ x: cx, y: cy }]
  // UF and raca modes need different spacing handling
  const isUF = mode === 'uf'
  // Max 5px margin between pixels: 8px pixel + 5px margin each side = 13px center-to-center
  // Use 14-20px for slight breathing room
  // For raca and genero modes with clusters, use more spacing
  const isGenero = mode === 'genero'
  const isRacaMode = mode === 'raca'
  const spacing = isUF 
    ? 12 
    : isRacaMode
      ? Math.max(18, Math.min(24, Math.sqrt(count) * 1.4))
      : isGenero
        ? Math.max(16, Math.min(20, Math.sqrt(count) * 1.3))
        : Math.max(14, Math.min(18, Math.sqrt(count) * 1.2))
  let placed = 0
  for (let ring = 0; placed < count; ring++) {
    if (ring === 0) { positions.push({ x: cx, y: cy }); placed++; continue }
    const circumference = 2 * Math.PI * ring * spacing
    const nodesInRing = Math.max(6, Math.round(circumference / spacing))
    const angleStep = (2 * Math.PI) / nodesInRing
    for (let j = 0; j < nodesInRing && placed < count; j++) {
      const angle = j * angleStep + (ring % 2 === 0 ? 0 : angleStep / 2)
      positions.push({ x: cx + ring * spacing * Math.cos(angle), y: cy + ring * spacing * Math.sin(angle) })
      placed++
    }
  }
  return positions
}


// Escurece cor para modo claro (aumenta contraste no fundo branco)
function darkenForLight(hex: string, amount = 0.15): string {
  if (!hex.startsWith('#')) return hex
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)))
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)))
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (c: string): [number, number, number] => {
    if (c.startsWith('rgb')) {
      const m = c.match(/\d+/g)
      return m ? [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])] : [136, 136, 136]
    }
    const h = c.replace('#', '').padEnd(6, '0')
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
  }
  const [ar,ag,ab] = parse(a)
  const [br,bg,bb] = parse(b)
  const r = Math.round(ar + (br-ar)*t)
  const g = Math.round(ag + (bg-ag)*t)
  const bv = Math.round(ab + (bb-ab)*t)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bv.toString(16).padStart(2,'0')}`
}

interface NetworkNode extends Parlamentar {
  idx: number
  x: number
  y: number
  z: number
  targetX: number
  targetY: number
  currentColor: string
  initColor: string
  targetColor: string
}

interface NetworkGraphProps {
  onSelectParliamentarian: (parlamentar: Parlamentar) => void
  searchQuery: string
  filterPartido: string
  filterUF: string
  filterTipo: string
  filterBancada?: string
  filterGenero?: string
  filterFaixaEtaria?: string
  filterRaca?: string
  filterPatrimonio?: string
  filterAlinhamento?: string
  clusterMode: ClusterMode
  isDark: boolean
  showInitialAnimation: boolean
  onAnimationComplete?: () => void
  preservePositions?: boolean  // when true, skip congress re-init (returning from profile)
  animationsEnabled?: boolean
}

export function NetworkGraph({
  onSelectParliamentarian,
  searchQuery,
  filterPartido,
  filterUF,
  filterTipo,
  filterBancada,
  filterGenero,
  filterFaixaEtaria,
  filterRaca,
  filterPatrimonio,
  filterAlinhamento,
  clusterMode,
  isDark,
  showInitialAnimation,
  onAnimationComplete,
  preservePositions = false,
  animationsEnabled = true,
}: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nodesRef = useRef<NetworkNode[]>([])
  const dimRef = useRef({ W: 900, H: 600 })
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())

  const transformRef = useRef({ x: 0, y: 0, k: 1 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const pinchDistRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0 })

  const phaseRef = useRef<'congress' | 'transitioning' | 'clustered'>('congress')
  const colorTRef = useRef(0)
  const prevModeRef = useRef<ClusterMode | null>(null)

  const [hovered, setHovered] = useState<number | null>(null)
  const [clickedNode, setClickedNode] = useState<number | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [legendItems, setLegendItems] = useState<{label: string, color: string, key: string}[]>([])
  const [filteredCount, setFilteredCount] = useState(594)
  const [legendOpen, setLegendOpen] = useState(false)
  const [showPinchHint, setShowPinchHint] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const hasInteractedRef = useRef(false)
  const animEnabledRef = useRef(animationsEnabled)
  useEffect(() => { animEnabledRef.current = animationsEnabled }, [animationsEnabled])

  const parliamentarians = useMemo(() => getAllParliamentarians(), [])

  const filtered = useMemo(() => {
    const result = parliamentarians.filter(p => {
      if (filterPartido && p.partido !== filterPartido) return false
      if (filterUF && p.uf !== filterUF) return false
      if (filterTipo && p.tipo !== filterTipo) return false
      if (filterBancada && p.bancada !== filterBancada) return false
      if (filterGenero && p.genero !== filterGenero) return false
      if (filterFaixaEtaria && p.faixaEtaria !== filterFaixaEtaria) return false
      if (filterRaca && p.raca !== filterRaca) return false
      if (filterAlinhamento) {
        const ali = p.alinhamento
        if (filterAlinhamento === '0' && ali >= 25) return false
        if (filterAlinhamento === '25' && (ali < 25 || ali >= 50)) return false
        if (filterAlinhamento === '50' && (ali < 50 || ali >= 75)) return false
        if (filterAlinhamento === '75' && ali < 75) return false
      }
      if (filterPatrimonio && patrimonioLabel(p.patrimonio) !== filterPatrimonio) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const nameMatch = p.nomeUrna.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q)
        const partyMatch = p.partido.toLowerCase().includes(q)
        const ufMatch = p.uf.toLowerCase().includes(q)
        if (!nameMatch && !partyMatch && !ufMatch) return false
      }
      return true
    })
    
    console.debug('[DEBUG] Filtering:', { 
      total: parliamentarians.length, 
      filtered: result.length,
      filters: { filterPartido, filterUF, filterTipo, filterBancada, filterGenero, filterFaixaEtaria, filterRaca, filterAlinhamento, filterPatrimonio, searchQuery }
    })
    
    return result
  }, [parliamentarians, searchQuery, filterPartido, filterUF, filterTipo, filterBancada, filterGenero, filterFaixaEtaria, filterRaca, filterAlinhamento, filterPatrimonio])

  const filteredIds = useMemo(() => new Set(filtered.map(f => f.id)), [filtered])

  useEffect(() => { setFilteredCount(filtered.length) }, [filtered.length])

  useEffect(() => {
    console.debug('[DEBUG] Cluster distribution:', {
      mode: clusterMode,
      totalNodes: filtered.length,
      byTipo: {
        DEPUTADO_FEDERAL: filtered.filter(p => p.tipo === 'DEPUTADO_FEDERAL').length,
        SENADOR: filtered.filter(p => p.tipo === 'SENADOR').length,
      },
      byPartido: filtered.reduce((acc, p) => {
        acc[p.partido] = (acc[p.partido] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byGenero: filtered.reduce((acc, p) => {
        acc[p.genero] = (acc[p.genero] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byRaca: filtered.reduce((acc, p) => {
        acc[p.raca] = (acc[p.raca] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    })

    fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: filtered,
        question: `Currently using cluster mode: ${clusterMode}. With filters: ${JSON.stringify({ filterPartido, filterUF, filterTipo, filterBancada, filterGenero, filterRaca, filterAlinhamento })}. What cluster mode would best visualize this filtered data? Provide recommendations.`
      })
    }).then(r => r.json()).then(claude => {
      console.debug('[Claude Cluster Recommendation]', claude)
    }).catch(() => {})
  }, [clusterMode, filtered, filterPartido, filterUF, filterTipo, filterBancada, filterGenero, filterRaca, filterAlinhamento])

  const applyTargets = useCallback((mode: ClusterMode, nodes: NetworkNode[], W: number, H: number) => {
    const isMobile = W < 600
    // 1. Count nodes per cluster key (needed for repulsion + dynamic layout)
    const counts = new Map<string, number>()
    nodes.forEach(n => {
      const key = getClusterKey(n, mode)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })

    // 2. Compute centers with repulsion pass
    const centers = computeClusterCenters(mode, W, H, counts)

    // 3. Group and assign positions
    const groups = new Map<string, NetworkNode[]>()
    nodes.forEach(n => {
      const key = getClusterKey(n, mode)
      const g = groups.get(key) || []
      g.push(n)
      groups.set(key, g)
    })

    // FIX: In 'tipo' mode, position nodes precisely as dome shapes
    if (mode === 'tipo') {
      const domes = domesLayout(W, H)
      const senPositions  = domes.filter((d: {x:number;y:number;region:string;color:string}) => d.region === 'senado')
      const camPositions  = domes.filter((d: {x:number;y:number;region:string;color:string}) => d.region === 'camara')
      let si = 0, ci = 0
      nodes.forEach(n => {
        if (n.tipo === 'SENADOR') {
          const pos = senPositions[si % senPositions.length]
          n.targetX = pos.x; n.targetY = pos.y
          n.initColor = n.currentColor; n.targetColor = '#34D399'  // Senado = verde
          si++
        } else {
          const pos = camPositions[ci % camPositions.length]
          n.targetX = pos.x; n.targetY = pos.y
          n.initColor = n.currentColor; n.targetColor = '#818CF8'  // Câmara = índigo
          ci++
        }
      })
    } else if (mode === 'cotas') {
      // Horizontal bar layout - sorted by expenses
      const byCota = new Map<string, NetworkNode[]>()
      nodes.forEach(n => {
        const cotas = (n as any).cotas ?? 0
        const cotasTotal = (n as any).cotasTotal ?? 0
        // Consider both number of records AND total amount
        const hasDespesas = cotas > 0 || cotasTotal > 0
        let key: string
        if (!hasDespesas) key = 'Sem despesas'
        else if (cotas >= 600) key = '600+ despesas'
        else if (cotas >= 400) key = '400-599'
        else if (cotas >= 200) key = '200-399'
        else key = '1-199'
        
        if (!byCota.has(key)) byCota.set(key, [])
        byCota.get(key)!.push(n)
      })
      
      byCota.forEach((gnodes, key) => {
        const center = centers.get(key) || { x: W / 2, y: H / 2 }
        const positions = buildClusterPositions(gnodes.length, center.x, center.y, mode)
        gnodes.forEach((n, i) => {
          n.targetX = positions[i]?.x ?? center.x
          n.targetY = positions[i]?.y ?? center.y
          n.initColor = n.currentColor
          n.targetColor = getNodeColor(n, mode)
        })
      })
    } else {
      groups.forEach((gnodes, key) => {
        const center = centers.get(key) || { x: W / 2, y: H / 2 }
        const positions = buildClusterPositions(gnodes.length, center.x, center.y, mode)
        gnodes.forEach((n, i) => {
          n.targetX = positions[i]?.x ?? center.x
          n.targetY = positions[i]?.y ?? center.y
          n.initColor = n.currentColor
          n.targetColor = getNodeColor(n, mode)
        })
      })
    }

    // 4. Legend
    const items: {label: string, color: string, key: string}[] = []
    if (mode === 'partido') {
      // Show ALL parties with at least 1 member
      const countsMap = counts ?? new Map<string, number>()
      const sorted = [...countsMap.entries()].sort((a, b) => b[1] - a[1])
      sorted.forEach(([p, count]) => items.push({ label: `${p} (${count})`, color: partyColor(p), key: p }))
    } else if (mode === 'uf') {
      UFS.forEach(u => items.push({ label: u, color: UF_COLORS[u] || '#888', key: u }))
    } else if (mode === 'tema') {
      TEMAS_FULL.forEach(t => items.push({ label: t, color: TEMA_COLORS[t] || '#888', key: t }))
    } else if (mode === 'tipo') {
      items.push({ label: 'Deputados Federais', color: '#818CF8', key: 'Deputados' })
      items.push({ label: 'Senadores', color: '#34D399', key: 'Senadores' })
    } else if (mode === 'genero') {
      items.push({ label: 'Homem Cis',      color: GENERO_COLORS['Homem'], key: 'Homem Cis' })
      items.push({ label: 'Mulher Cis',     color: GENERO_COLORS['Mulher'], key: 'Mulher Cis' })
      items.push({ label: 'Mulher Trans',  color: GENERO_COLORS['Trans'], key: 'Mulher Trans' })
      items.push({ label: 'Não-binárie',   color: GENERO_COLORS['NaoBinarie'], key: 'Não-binárie' })
    } else if (mode === 'faixaEtaria') {
      const PAL: Record<string,string> = {'1 mandato':'#38BDF8','2-3 mandatos':'#818CF8','4-5 mandatos':'#A78BFA','6+ mandatos':'#E879F9'}
      FAIXAS_ETARIAS.forEach(f => items.push({ label: f, color: PAL[f] || '#888', key: f }))
    } else if (mode === 'raca') {
      RACAS.forEach(r => items.push({ label: r, color: RACA_COLORS[r] || '#888', key: r }))
    } else if (mode === 'bancada') {
      BANCADAS.forEach(b => items.push({ label: b, color: BANCADA_COLORS[b] || '#888', key: b }))
    } else if (mode === 'patrimonio') {
      PATRIMONIO_LABELS.forEach((l, i) => items.push({ label: l, color: PATRIMONIO_COLORS[i], key: l }))
    } else if (mode === 'cotas') {
      [
        { label: '600+ despesas', color: '#EF4444', key: '600+ despesas' },
        { label: '400-599', color: '#F97316', key: '400-599' },
        { label: '200-399', color: '#FACC15', key: '200-399' },
        { label: '1-199', color: '#22C55E', key: '1-199' },
        { label: 'Sem despesas', color: '#64748B', key: 'Sem despesas' },
      ].forEach(i => items.push(i))
    }
    setLegendItems(items)
  }, [])

  function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x+r, y)
    ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r)
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r)
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r)
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r)
    ctx.closePath()
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { W, H } = dimRef.current
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1
    const { x: tx, y: ty, k: scale } = transformRef.current
    const { x: mx, y: my } = mouseRef.current

    ctx.clearRect(0, 0, W * dpr, H * dpr)
    ctx.save()
    ctx.scale(dpr, dpr)

    ctx.fillStyle = isDark ? '#0A0A0A' : '#FAFAFA'
    ctx.fillRect(0, 0, W, H)

    ctx.translate(tx, ty)
    ctx.scale(scale, scale)

    const nodes = nodesRef.current
    const hov = hovered
    const phase = phaseRef.current

    // Congress building label + subtitle — show while in congress phase
    if (phase === 'congress') {
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.globalAlpha = 0.7
      ctx.font = `900 13px 'Helvetica Neue', Helvetica, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A'
      ctx.fillText('CONGRESSO NACIONAL', W / 2, H * 0.88)
      ctx.font = `400 10px 'Helvetica Neue', Helvetica, sans-serif`
      ctx.globalAlpha = 0.4
      ctx.fillStyle = isDark ? '#94A3B8' : '#64748B'
      ctx.fillText('594 parliamentarians · Senado + Câmara dos Deputados', W / 2, H * 0.88 + 16)
      ctx.restore()
      ctx.globalAlpha = 1
    }

    // Nós como pixels — drawn first
    const nodeSize = Math.max(5, 8 / Math.sqrt(Math.max(0.3, scale)))
    const PHOTO_ZOOM = 3 // show photos above this zoom level

    nodes.forEach((n, i) => {
      const isHov = hov === i
      const isFiltered = !filteredIds.has(n.id)

      // No parallax effect - pixels stay fixed
      const drawX = n.x
      const drawY = n.y

      ctx.globalAlpha = isFiltered ? 0 : isHov ? 1 : (phase === 'congress' ? 0.92 : 0.85)
      const size = isHov ? nodeSize * 1.4 : nodeSize
      const half = size / 2
      const radius = size * 0.22

      // At high zoom: show photo
      if (scale >= PHOTO_ZOOM && n.urlFoto && !isFiltered) {
        const cached = imgCacheRef.current.get(n.id)
        if (cached && cached.complete && cached.naturalWidth > 0) {
          // Draw rounded-rect photo
          ctx.save()
          ctx.globalAlpha = isHov ? 1 : 0.9
          ctx.beginPath()
          const rx = drawX - half, ry = drawY - half
          ctx.moveTo(rx + radius, ry)
          ctx.lineTo(rx + size - radius, ry); ctx.arcTo(rx + size, ry, rx + size, ry + radius, radius)
          ctx.lineTo(rx + size, ry + size - radius); ctx.arcTo(rx + size, ry + size, rx + size - radius, ry + size, radius)
          ctx.lineTo(rx + radius, ry + size); ctx.arcTo(rx, ry + size, rx, ry + size - radius, radius)
          ctx.lineTo(rx, ry + radius); ctx.arcTo(rx, ry, rx + radius, ry, radius)
          ctx.closePath()
          ctx.clip()
          ctx.drawImage(cached, rx, ry, size, size)
          ctx.restore()
        } else if (!cached) {
          // Start loading
          const img = new Image()
          
          img.src = n.urlFoto
          img.onload = () => imgCacheRef.current.set(n.id, img)
          imgCacheRef.current.set(n.id, img)
          // Draw colour square as placeholder
          ctx.fillStyle = isDark ? n.currentColor : darkenForLight(n.currentColor)
          ctx.fillRect(drawX - half, drawY - half, size, size)
        } else {
          // Still loading
          ctx.fillStyle = isDark ? n.currentColor : darkenForLight(n.currentColor)
          ctx.fillRect(drawX - half, drawY - half, size, size)
        }
      } else {
        ctx.fillStyle = isDark ? n.currentColor : darkenForLight(n.currentColor)
        ctx.fillRect(drawX - half, drawY - half, size, size)
      }

      if (isHov && !isFiltered) {
        ctx.globalAlpha = 1
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 1.5 / scale
        ctx.strokeRect(drawX - half - 2.5/scale, drawY - half - 2.5/scale, size + 5/scale, size + 5/scale)
      }
    })

    // Labels de cluster - drawn AFTER nodes so they appear on top
    if (phase !== 'congress') {
      // Recompute counts and centers for accurate label positions
      const labelCounts = new Map<string, number>()
      nodes.forEach(n => {
        const key = getClusterKey(n, clusterMode)
        labelCounts.set(key, (labelCounts.get(key) ?? 0) + 1)
      })
      const centers = computeClusterCenters(clusterMode, W, H, labelCounts)
      const groups = new Map<string, {minY: number, cx: number, count: number}>()

      nodes.forEach(n => {
        const key = getClusterKey(n, clusterMode)
        const g = groups.get(key)
        if (!g) {
          groups.set(key, { minY: n.y, cx: n.x, count: 1 })
        } else {
          g.minY = Math.min(g.minY, n.y)
          g.cx = (g.cx * g.count + n.x) / (g.count + 1)
          g.count++
        }
      })

      const fontSize = Math.max(9, 13 / scale)
      ctx.font = `700 ${fontSize}px 'Helvetica Neue', Helvetica, sans-serif`
      ctx.textAlign = 'center'

      const alpha = phase === 'clustered' ? 1 : colorTRef.current
      
      centers.forEach((center, label) => {
        const g = groups.get(label)
        if (!g || g.count === 0) return

        const color = (() => {
          if (clusterMode === 'partido') return partyColor(label)
          if (clusterMode === 'uf') return UF_COLORS[label] || '#94A3B8'
          if (clusterMode === 'tema') return TEMA_COLORS[label] || '#94A3B8'
          if (clusterMode === 'tipo') return label === 'Senadores' ? '#34D399' : '#818CF8'
          if (clusterMode === 'genero') {
            // Map display labels back to internal values for color lookup
            const generoMap: Record<string, Genero> = {
              'Homem Cis': 'Homem',
              'Mulher Cis': 'Mulher',
              'Mulher Trans': 'Trans',
              'Não-binárie': 'NaoBinarie'
            }
            const generoKey = generoMap[label] || label as Genero
            return GENERO_COLORS[generoKey] || '#94A3B8'
          }
          if (clusterMode === 'faixaEtaria') {
            const PAL: Record<string,string> = {'1 mandato':'#38BDF8','2-3 mandatos':'#818CF8','4-5 mandatos':'#A78BFA','6+ mandatos':'#E879F9'}
            return PAL[label] || '#94A3B8'
          }
          if (clusterMode === 'raca') return RACA_COLORS[label as Raca] || '#94A3B8'
          if (clusterMode === 'bancada') return BANCADA_COLORS[label as Bancada] || '#94A3B8'
          if (clusterMode === 'patrimonio') {
            const idx = PATRIMONIO_LABELS.indexOf(label as typeof PATRIMONIO_LABELS[number])
            return idx >= 0 ? PATRIMONIO_COLORS[idx] : '#94A3B8'
          }
          return '#94A3B8'
        })()

        const labelY = g.minY - (22 / scale)
        const textW = ctx.measureText(label).width
        const pad = 5 / scale

        ctx.globalAlpha = alpha * 0.95
        ctx.fillStyle = isDark ? 'rgba(6,13,26,0.85)' : 'rgba(241,245,249,0.92)'
        rrect(ctx, center.x - textW/2 - pad, labelY - fontSize - pad/2, textW + pad*2, fontSize + pad, 3/scale)
        ctx.fill()

        ctx.globalAlpha = alpha
        ctx.fillStyle = color
        ctx.textBaseline = 'bottom'
        ctx.fillText(label, center.x, labelY)

        // contagem
        const smallFont = Math.max(7, fontSize * 0.72)
        ctx.font = `400 ${smallFont}px 'Helvetica Neue', Helvetica, sans-serif`
        ctx.globalAlpha = alpha * 0.6
        ctx.fillStyle = isDark ? '#94A3B8' : '#64748B'
        ctx.fillText(`${g.count}`, center.x, labelY + fontSize * 0.5)
        ctx.globalAlpha = 1

        ctx.font = `700 ${fontSize}px 'Helvetica Neue', Helvetica, sans-serif`
      })
    }

    ctx.restore()

    // Tooltip - mostra no hover OU quando clicado
    const tooltipNode = clickedNode !== null ? clickedNode : hov
    if (tooltipNode !== null && nodes[tooltipNode] && filteredIds.has(nodes[tooltipNode].id)) {
      const n = nodes[tooltipNode]
      const screenX = n.x * scale + tx
      const screenY = n.y * scale + ty

      ctx.save()
      ctx.scale(dpr, dpr)

      const color = (n.currentColor && (n.currentColor.startsWith('#') || n.currentColor.startsWith('rgb'))) ? n.currentColor : '#3B82F6'
      const lines = [
        n.nomeUrna || n.nome || 'Nome não disponível',
        `${n.partido || 'S.PART.'} · ${n.uf || '??'} · ${n.tipo === 'SENADOR' ? 'Senador(a)' : 'Dep. Federal'}`,
        `Alinhamento ${n.alinhamento ?? 0}% · Freq. ${Math.round((n.frequencia ?? 0) * 100)}%`,
      ]
      ctx.font = "600 12px 'Helvetica Neue', sans-serif"
      const maxW = Math.max(...lines.map(l => ctx.measureText(l).width))
      
      // Card com foto - maior
      const photoSize = 42
      const bw = maxW + photoSize + 36
      const bh = Math.max(lines.length * 19 + 32, photoSize + 32)
      const lx = Math.max(8, Math.min(screenX - bw / 2, W - bw - 8))
      const ly = Math.max(bh + 8, screenY - 12)

      // Fundo com cor do pixel
      ctx.globalAlpha = 0.97
      ctx.fillStyle = color
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 20
      rrect(ctx, lx, ly - bh, bw, bh, 10)
      ctx.fill()
      ctx.shadowBlur = 0

      // Foto do parlamentar (ou placeholder com iniciais)
      const photoX = lx + 10
      const photoY = ly - bh + 10
      let cached = imgCacheRef.current.get(n.id)
      
      // Se não tiver no cache mas tem URL, carregar agora
      if (!cached && n.urlFoto) {
        const img = new Image()
        
        img.src = n.urlFoto
        imgCacheRef.current.set(n.id, img)
        cached = img
      }
      
      ctx.save()
      ctx.beginPath()
      rrect(ctx, photoX, photoY, photoSize, photoSize, 6)
      ctx.clip()
      
      if (cached && cached.complete && cached.naturalWidth > 0) {
        // Object-fit:cover — center-crop the image
        const iw = cached.naturalWidth, ih = cached.naturalHeight
        let sx = 0, sy = 0, sw = iw, sh = ih
        if (iw / ih > 1) { sw = ih; sx = (iw - ih) / 2 }
        else { sh = iw; sy = (ih - iw) / 2 }
        ctx.drawImage(cached, sx, sy, sw, sh, photoX, photoY, photoSize, photoSize)
      } else {
        // Placeholder preto com iniciais
        ctx.fillStyle = '#000000'
        ctx.fillRect(photoX, photoY, photoSize, photoSize)
        // Iniciais
        const initials = n.nomeUrna.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
        ctx.fillStyle = '#FFFFFF'
        ctx.font = "700 16px 'Helvetica Neue', sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(initials, photoX + photoSize/2, photoY + photoSize/2)
      }
      ctx.restore()

      // Texto preto sobre fundo colorido
      ctx.globalAlpha = 1
      const textX = photoX + photoSize + 10
      lines.forEach((line, i) => {
        ctx.font = i === 0 ? "700 12px 'Helvetica Neue', sans-serif" : "400 10px 'Helvetica Neue', sans-serif"
        ctx.fillStyle = '#000000'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(line, textX, ly - bh + 14 + i * 17)
      })
      
      // Instrução de clique (se não estiver clicado)
      if (clickedNode === null) {
        ctx.font = "400 9px 'Helvetica Neue', sans-serif"
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillText('Clique para fixar', textX, ly - 20)
      } else {
        ctx.font = "400 9px 'Helvetica Neue', sans-serif"
        ctx.fillStyle = '#000000'
        ctx.fillText('Clique para abrir perfil', textX, ly - 20)
      }
      
      ctx.restore()
    }
  }, [hovered, clickedNode, filteredIds, isDark, clusterMode])

  useEffect(() => {
    let af: number
    const loop = () => {
      const nodes = nodesRef.current
      const phase = phaseRef.current

      if (phase === 'transitioning' && nodes.length > 0) {
        const animOn = animEnabledRef.current
        const EASE = animOn ? 0.028 : 1.0  // snap immediately when disabled
        let allSettled = true
        nodes.forEach(n => {
          const dx = n.targetX - n.x, dy = n.targetY - n.y
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) allSettled = false
          n.x += dx * EASE
          n.y += dy * EASE
        })

        if (colorTRef.current < 1) {
          colorTRef.current = Math.min(1, colorTRef.current + (animOn ? 0.012 : 1.0))
          nodes.forEach(n => {
            n.currentColor = lerpColor(n.initColor, n.targetColor, colorTRef.current)
          })
        }

        if (allSettled && colorTRef.current >= 1) phaseRef.current = 'clustered'
      }

      draw()
      af = requestAnimationFrame(loop)
    }
    af = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(af)
  }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    // If data not yet loaded, show congress building as loading animation
    if (parliamentarians.length === 0) {
      // Draw congress building placeholder
      const rect2 = container.getBoundingClientRect()
      const W2 = rect2.width || window.innerWidth
      const H2 = rect2.height || window.innerHeight
      const dpr2 = window.devicePixelRatio || 1
      canvas.width = W2 * dpr2
      canvas.height = H2 * dpr2
      canvas.style.width = `${W2}px`
      canvas.style.height = `${H2}px`
      dimRef.current = { W: W2, H: H2 }
      const congLayout = congressLayout(W2, H2)
      const ctx2 = canvas.getContext('2d')
      if (ctx2) {
        ctx2.scale(dpr2, dpr2)
        const bgCol = isDark ? '#0A0A0A' : '#FAFAFA'
        ctx2.fillStyle = bgCol
        ctx2.fillRect(0, 0, W2, H2)
        const nodeS = 8
        congLayout.forEach(pos => {
          ctx2.globalAlpha = 0.88
          ctx2.fillStyle = isDark ? pos.color : darkenForLight(pos.color)
          ctx2.fillRect(pos.x - nodeS/2, pos.y - nodeS/2, nodeS, nodeS)
        })
        ctx2.globalAlpha = 0.5
        ctx2.fillStyle = isDark ? '#F8FAFC' : '#0F172A'
        ctx2.font = "900 12px 'Helvetica Neue', Helvetica, sans-serif"
        ctx2.textAlign = 'center'
        ctx2.textBaseline = 'bottom'
        ctx2.fillText('CONGRESSO NACIONAL', W2/2, H2*0.88)
        ctx2.globalAlpha = 1
      }
      return
    }

    const rect = container.getBoundingClientRect()
    const W = rect.width || window.innerWidth
    const H = rect.height || window.innerHeight
    const dpr = window.devicePixelRatio || 1

    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    dimRef.current = { W, H }

    const layout = congressLayout(W, H)
    nodesRef.current = parliamentarians.map((p, i) => {
      const pos = layout[i] || { x: W / 2, y: H / 2, color: p.color }
      return {
        ...p, idx: i,
        x: pos.x, y: pos.y,
        z: 1, // No variation in z for consistent positioning
        targetX: pos.x, targetY: pos.y,
        initColor: pos.color, currentColor: pos.color, targetColor: pos.color,
      } as NetworkNode
    })

    if (preservePositions && phaseRef.current === 'clustered') {
      // Returning from profile — keep positions as-is
      prevModeRef.current = clusterMode
    } else if (showInitialAnimation && animationsEnabled && nodesRef.current.length > 0) {
      phaseRef.current = 'congress'
      setTimeout(() => {
        applyTargets(clusterMode, nodesRef.current, W, H)
        colorTRef.current = 0
        phaseRef.current = 'transitioning'
        prevModeRef.current = clusterMode
        onAnimationComplete?.()
      }, 2800) // hold building for ~2.8s then disperse
    } else {
      applyTargets(clusterMode, nodesRef.current, W, H)
      colorTRef.current = 0
      phaseRef.current = 'transitioning'
      prevModeRef.current = clusterMode
    }

    setIsReady(true)
    
    // Mostrar hint de pinch no mobile - apenas se nunca viu antes
    const seenHint = typeof window !== 'undefined' && localStorage.getItem('seenPinchHint')
    if (W < 768 && !seenHint && !hasInteractedRef.current) {
      setShowPinchHint(true)
      setTimeout(() => {
        setShowPinchHint(false)
        hasInteractedRef.current = true
        if (typeof window !== 'undefined') localStorage.setItem('seenPinchHint', '1')
      }, 5000)
    }
    
    // Pré-carregar fotos dos parliamentarians para o tooltip
    parliamentarians.forEach(p => {
      if (p.urlFoto && !imgCacheRef.current.has(p.id)) {
        const img = new Image()
        
        img.src = p.urlFoto
        imgCacheRef.current.set(p.id, img)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parliamentarians])

  useEffect(() => {
    if (!isReady || prevModeRef.current === clusterMode || phaseRef.current === 'congress') return
    prevModeRef.current = clusterMode
    const { W, H } = dimRef.current
    applyTargets(clusterMode, nodesRef.current, W, H)
    colorTRef.current = 0
    phaseRef.current = 'transitioning'
  }, [clusterMode, isReady, applyTargets])

  const panToCluster = useCallback((key: string) => {
    const { W, H } = dimRef.current
    const counts = new Map<string, number>()
    nodesRef.current.forEach(n => {
      const k = getClusterKey(n, clusterMode)
      counts.set(k, (counts.get(k) ?? 0) + 1)
    })
    const centers = computeClusterCenters(clusterMode, W, H, counts)
    const center = centers.get(key)
    if (center) {
      const { k } = transformRef.current
      transformRef.current.x = W / 2 - center.x * k
      transformRef.current.y = H / 2 - center.y * k
    }
  }, [clusterMode])

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { x: tx, y: ty, k } = transformRef.current
    return { x: (sx - tx) / k, y: (sy - ty) / k }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    mouseRef.current = { x: sx, y: sy }
    if (isDraggingRef.current) {
      transformRef.current.x = dragStartRef.current.tx + (sx - dragStartRef.current.x)
      transformRef.current.y = dragStartRef.current.ty + (sy - dragStartRef.current.y)
      return
    }
    const { x: mx, y: my } = screenToWorld(sx, sy)
    // Tighter hit detection - only select pixels that are actually under cursor
    const baseHitRadius = 8
    let closest: number | null = null, closestD = baseHitRadius / transformRef.current.k
    nodesRef.current.forEach((n, i) => {
      if (!filteredIds.has(n.id)) return
      const d = Math.hypot(n.x - mx, n.y - my)
      if (d < closestD) { closestD = d; closest = i }
    })
    setHovered(closest)
  }, [screenToWorld, filteredIds])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, tx: transformRef.current.x, ty: transformRef.current.y }
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const moved = Math.hypot((e.clientX - rect.left) - dragStartRef.current.x, (e.clientY - rect.top) - dragStartRef.current.y)
    isDraggingRef.current = false
    
    if (moved < 5) {
      if (hovered !== null) {
        // Se já está clicado no mesmo nó, abre o perfil
        if (clickedNode === hovered) {
          onSelectParliamentarian(nodesRef.current[hovered])
          setClickedNode(null)
        } else {
          // Primeiro clique: fixa o tooltip
          setClickedNode(hovered)
        }
      } else {
        // Clicou fora: deseleciona
        setClickedNode(null)
      }
    }
  }, [hovered, clickedNode, onSelectParliamentarian])

  // ── Wheel zoom nativo (passive:false para poder preventDefault) ───────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top
      const oldK = transformRef.current.k
      const factor = e.deltaY > 0 ? 0.88 : 1.14
      const newK = Math.max(0.18, Math.min(8, oldK * factor))
      transformRef.current.x = sx - (sx - transformRef.current.x) * (newK / oldK)
      transformRef.current.y = sy - (sy - transformRef.current.y) * (newK / oldK)
      transformRef.current.k = newK
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [isReady])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    // Esconder hint de pinch na primeira interação
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true
      setShowPinchHint(false)
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchDistRef.current = Math.sqrt(dx*dx + dy*dy)
    } else if (e.touches.length === 1) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      isDraggingRef.current = true
      dragStartRef.current = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top, tx: transformRef.current.x, ty: transformRef.current.y }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (pinchDistRef.current > 0) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX)/2 - rect.left
        const midY = (e.touches[0].clientY + e.touches[1].clientY)/2 - rect.top
        const oldK = transformRef.current.k
        const newK = Math.max(0.18, Math.min(8, oldK * (dist / pinchDistRef.current)))
        transformRef.current.x = midX - (midX - transformRef.current.x) * (newK / oldK)
        transformRef.current.y = midY - (midY - transformRef.current.y) * (newK / oldK)
        transformRef.current.k = newK
      }
      pinchDistRef.current = dist
    } else if (e.touches.length === 1 && isDraggingRef.current) {
      transformRef.current.x = dragStartRef.current.tx + (e.touches[0].clientX - rect.left - dragStartRef.current.x)
      transformRef.current.y = dragStartRef.current.ty + (e.touches[0].clientY - rect.top - dragStartRef.current.y)
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      isDraggingRef.current = false
      pinchDistRef.current = 0
      
      if (hovered !== null) {
        // Se já está clicado no mesmo nó, abre o perfil
        if (clickedNode === hovered) {
          onSelectParliamentarian(nodesRef.current[hovered])
          setClickedNode(null)
        } else {
          // Primeiro toque: fixa o tooltip
          setClickedNode(hovered)
        }
      } else {
        // Tocou fora: deseleciona
        setClickedNode(null)
      }
    }
  }, [hovered, clickedNode, onSelectParliamentarian])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ cursor: hovered !== null ? 'pointer' : 'grab' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDraggingRef.current = false; setHovered(null); setClickedNode(null) }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Legenda - minimizavel */}
      {legendItems.length > 0 && (
        <div
          className="absolute bottom-20 left-4 rounded-xl backdrop-blur-md overflow-hidden transition-all"
          style={{
            backgroundColor: isDark ? 'rgba(6,13,26,0.88)' : 'rgba(241,245,249,0.92)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'}`,
            width: legendOpen ? '160px' : 'auto',
          }}
        >
          {/* Header com toggle */}
          <button 
            onClick={() => setLegendOpen(!legendOpen)}
            className="w-full flex items-center justify-between gap-2 p-2.5 text-left"
            style={{ borderBottom: legendOpen ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` : 'none' }}
          >
            <span className="text-[10px] font-mono font-semibold" style={{ color: isDark ? '#94A3B8' : '#475569' }}>
              {legendOpen ? 'Legenda' : 'Leg.'}
            </span>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#64748B' : '#94A3B8'} strokeWidth={2} style={{ transform: legendOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <path d="m18 15-6-6-6 6"/>
            </svg>
          </button>
          {legendOpen && (
            <div className="p-2.5 pt-1.5 max-h-80 overflow-y-auto space-y-1.5">
              {legendItems.slice(0, 50).map(item => (
                <button
                  key={item.key}
                  onClick={() => panToCluster(item.key)}
                  className="w-full flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    background: selectedCluster === item.key ? `${item.color}22` : 'transparent',
                    borderRadius: 4,
                    padding: '2px 4px',
                    marginLeft: -4,
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] truncate font-mono" style={{ color: isDark ? '#94A3B8' : '#475569' }}>
                    {item.label}
                  </span>
                </button>
              ))}
              {legendItems.length > 50 && (
                <div className="text-[10px] font-mono" style={{ color: isDark ? '#475569' : '#94A3B8' }}>
                  +{legendItems.length - 50} mais
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contador de filtro */}
      <div
        className="absolute bottom-4 left-4 text-[11px] font-mono px-3 py-1.5 rounded-lg"
        style={{
          backgroundColor: isDark ? 'rgba(6,13,26,0.75)' : 'rgba(241,245,249,0.85)',
          color: isDark ? '#475569' : '#94A3B8',
        }}
      >
        {filteredCount === 594 ? '594 parliamentarians' : `${filteredCount} / 594 exibidos`}
      </div>

      {/* Hint de pinch-to-zoom no mobile */}
      {showPinchHint && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-50 cursor-pointer"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => { setShowPinchHint(false); hasInteractedRef.current = true; if (typeof window !== 'undefined') localStorage.setItem('seenPinchHint', '1') }}
          onTouchStart={() => { setShowPinchHint(false); hasInteractedRef.current = true; if (typeof window !== 'undefined') localStorage.setItem('seenPinchHint', '1') }}
        >
          <div 
            className="flex flex-col items-center gap-4 p-6 rounded-2xl"
            style={{ backgroundColor: isDark ? 'rgba(6,13,26,0.95)' : 'rgba(255,255,255,0.95)' }}
          >
            {/* Ícone de pinch */}
            <svg width={64} height={64} viewBox="0 0 64 64" fill="none">
              {/* Mão esquerda */}
              <circle cx={20} cy={32} r={8} fill={isDark ? '#475569' : '#94A3B8'} opacity={0.6}>
                <animate attributeName="cx" values="20;16;20" dur="1.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx={20} cy={32} r={4} fill={isDark ? '#94A3B8' : '#64748B'}>
                <animate attributeName="cx" values="20;16;20" dur="1.5s" repeatCount="indefinite"/>
              </circle>
              {/* Mão direita */}
              <circle cx={44} cy={32} r={8} fill={isDark ? '#475569' : '#94A3B8'} opacity={0.6}>
                <animate attributeName="cx" values="44;48;44" dur="1.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx={44} cy={32} r={4} fill={isDark ? '#94A3B8' : '#64748B'}>
                <animate attributeName="cx" values="44;48;44" dur="1.5s" repeatCount="indefinite"/>
              </circle>
              {/* Setas */}
              <path d="M28 32 L36 32" stroke={isDark ? '#64748B' : '#94A3B8'} strokeWidth={2} strokeDasharray="2,2"/>
              <path d="M12 32 L8 28 M12 32 L8 36" stroke={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2} strokeLinecap="round">
                <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
              </path>
              <path d="M52 32 L56 28 M52 32 L56 36" stroke={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2} strokeLinecap="round">
                <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
              </path>
            </svg>
            <p 
              className="text-sm font-medium text-center"
              style={{ 
                color: isDark ? '#E2E8F0' : '#1E293B',
                fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
              }}
            >
              Use dois dedos para<br/>navegar e dar zoom
            </p>
            <p 
              className="text-xs"
              style={{ color: isDark ? '#64748B' : '#94A3B8' }}
            >
              Toque para continuar
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
