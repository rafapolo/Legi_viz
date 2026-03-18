/**
 * lib/parliamentarians.ts — fonte de dados unificada
 */

export type TipoCargo    = 'DEPUTADO_FEDERAL' | 'SENADOR'
export type Genero       = 'Homem' | 'Mulher' | 'Trans' | 'NaoBinarie'
export type TempoMandato = '1 mandato' | '2-3 mandatos' | '4-5 mandatos' | '6+ mandatos'
export type FaixaEtaria  = TempoMandato   // alias de compat
export type Raca         = 'Branco' | 'Pardo' | 'Preto' | 'Amarelo' | 'Indigena'
export type Bancada      = 'Evangelica' | 'Ruralista' | 'Bala' | 'Empresarial' | 'Sindical' | 'Ambientalista' | 'Feminina' | 'Nenhuma'
export type VotoBandidagem = 'sim' | 'nao' | 'abs' | 'aus'

export interface Parlamentar {
  id:               string
  idNumerico:       number
  nome:             string
  nomeUrna:         string
  tipo:             TipoCargo
  partido:          string
  uf:               string
  urlFoto:          string
  email:            string
  alinhamento:      number
  frequencia:       number
  frequenciaReal?:   number      // Real presence rate from Câmara API
  mandatosReais?:    number      // Real number of mandates from Câmara API
  mandatos:         number
  processos:        number
  patrimonio:       number        // R$ mil
  profissao:        string
  dataNascimento:   string
  faixaEtaria:      TempoMandato
  genero:           Genero
  raca:             Raca
  bancada:          string     // Primary bancada (for backward compatibility)
  bancadas:         string[]   // All bancadas the deputy belongs to
  temaScores:       number[]
  macroTema:        string
  color:            string
  votoBandidagem:   VotoBandidagem
  projetosAprovados: number
  cotas:            number     // Number of expense records
  // Real expense data
  salario?:          number     // Monthly salary
  cotasTotal?:       number     // Total expenses in 2024
  emendas?:          number     // Total amendments
  emendasPix?:       number     // Pix amendments (R$ mil)
  // Contextualização estatística (Framework Karina Marra)
  ctxEmendas?:       ZScoreContext
  ctxPatrimonio?:    ZScoreContext
  ctxCotas?:         ZScoreContext
  ctxFrequencia?:    ZScoreContext
  // TSE data
  financiamento?: {
    receita_total: number      // R$ mil
    despesas_total: number
    recursos_proprios: number
    receitas_partidos: number
    receitas_pessoas: number
    receitas_juridicas: number
  }
  processosReais?: { count: number; motivos: string[] }  // Real process data from TSE
  cassado?:         string       // Reason if cassado/renunciado
}

export const TEMAS = [
  'Saúde','Segurança','Agro','Educação',
  'Economia','Meio Ambiente','Infraestrutura','Direitos',
] as const

// ── Framework de Contextualização Estatística ──────────────────────────────
// Baseado em: "Ciência de Dados Cívica Aplicada à Transparência Legislativa"
// Profª Dra. Karina Marra
//
// Princípios:
// 1. Z-scores: z = (x - μ) / σ para contextualizar valores absolutos
// 2. Normalização: comparar baseado em contexto (estado, partido)
// 3. Separação dados/opinião: mostrar apenas o que os dados dizem
// 4. Metodologia aberta: cálculos documentados

// Estatísticas pré-calculadas para contextualização
// Médias e desvios padrão baseados nos dados reais da Câmara

// Estatísticas de emendas Pix (em milhões de R$)
const EMENDAS_STATS = { media: 17.6, desvio: 58.8 } // ~R$17.6M média, ~R$58.8M desvio

// Estatísticas de patrimônio (em R$ mil)
const PATRIMONIO_STATS = { media: 1500, desvio: 3000 } // ~R$1.5M média

// Estatísticas de cotas (número de registros)
const COTAS_STATS = { media: 200, desvio: 100 }

export interface ZScoreContext {
  valor: number
  zScore: number
  label: string  // e.g., "Acima da média", "2σ acima", etc.
  comparacao: string  // e.g., "Top 5%", "Acima de 84% dos deputados"
}

// Calcula z-score: z = (x - μ) / σ
function calcZScore(valor: number, media: number, desvio: number): number {
  if (desvio === 0) return 0
  return (valor - media) / desvio
}

// Gera label contextual baseado no z-score
function zScoreLabel(z: number): { label: string; comparacao: string } {
  const absZ = Math.abs(z)
  if (z > 2) return { label: 'Muito acima', comparacao: 'Top ~2%' }
  if (z > 1.5) return { label: 'Acima', comparacao: 'Top ~7%' }
  if (z > 1) return { label: 'Acima da média', comparacao: 'Acima de 84%' }
  if (z > 0.5) return { label: 'Levemente acima', comparacao: 'Acima de 69%' }
  if (z >= -0.5) return { label: 'Na média', comparacao: 'Entre 31-69%' }
  if (z >= -1) return { label: 'Levemente abaixo', comparacao: 'Abaixo de 31%' }
  if (z >= -1.5) return { label: 'Abaixo da média', comparacao: 'Abaixo de 16%' }
  if (z >= -2) return { label: 'Abaixo', comparacao: 'Bottom ~7%' }
  return { label: 'Muito abaixo', comparacao: 'Bottom ~2%' }
}

// Contextualiza emendas Pix
export function contextualizaEmendas(pixMil: number): ZScoreContext {
  const z = calcZScore(pixMil, EMENDAS_STATS.media, EMENDAS_STATS.desvio)
  const { label, comparacao } = zScoreLabel(z)
  return {
    valor: pixMil,
    zScore: Math.round(z * 10) / 10,
    label,
    comparacao
  }
}

// Contextualiza patrimônio
export function contextualizaPatrimonio(patrimonioMil: number): ZScoreContext {
  const z = calcZScore(patrimonioMil, PATRIMONIO_STATS.media, PATRIMONIO_STATS.desvio)
  const { label, comparacao } = zScoreLabel(z)
  return {
    valor: patrimonioMil,
    zScore: Math.round(z * 10) / 10,
    label,
    comparacao
  }
}

// Contextualiza cotas
export function contextualizaCotas(cotas: number): ZScoreContext {
  const z = calcZScore(cotas, COTAS_STATS.media, COTAS_STATS.desvio)
  const { label, comparacao } = zScoreLabel(z)
  return {
    valor: cotas,
    zScore: Math.round(z * 10) / 10,
    label,
    comparacao
  }
}

// Contextualiza frequência de presença
export function contextualizaFrequencia(taxa: number): ZScoreContext {
  // Para frequência, maior é melhor, então invertemos a lógica
  // Média ~80%, desvio ~15%
  const MEDIA_FREQ = 80
  const DESVIO_FREQ = 15
  const z = calcZScore(taxa, MEDIA_FREQ, DESVIO_FREQ)
  const { label, comparacao } = zScoreLabel(-z) // Invertido: z negativo = bom
  return {
    valor: taxa,
    zScore: Math.round(z * 10) / 10,
    label,
    comparacao
  }
}

export const PARTIDOS = [
  'PL','PT','UNIÃO','PSD','MDB','PP','REPUBLICANOS','PDT',
  'PSDB','PODE','AVANTE','SOLIDARIEDADE','PSB','PCdoB',
  'CIDADANIA','PSOL','PV','NOVO','PRD','AGIR','DC','REDE','S.PART.',
  'PARTIDO(','FEDERAÇÃO','PCO','UP'
] as const

// Normalize party name - handle variations and typos from API
const PARTIDO_ALIASES: Record<string, string> = {
  'PL': 'PL', 'PARTIDO LIBERAL': 'PL',
  'PT': 'PT', 'PARTIDO DOS TRABALHADORES': 'PT',
  'UNIÃO': 'UNIÃO', 'UNIÃO BRASIL': 'UNIÃO',
  'PSD': 'PSD', 'PARTIDO SOCIAL DEMOCRÁTICO': 'PSD',
  'MDB': 'MDB', 'MOVIMENTO DEMOCRÁTICO BRASILEIRO': 'MDB',
  'PP': 'PP', 'PARTIDO PROGRESSISTA': 'PP', 'PROGRESSISTAS': 'PP',
  'REPUBLICANOS': 'REPUBLICANOS', 'PARTIDO REPUBLICANO BRASILEIRO': 'REPUBLICANOS', 'PRB': 'REPUBLICANOS',
  'PDT': 'PDT', 'PARTIDO DEMOCRÁTICO TRABALHADOR': 'PDT',
  'PSDB': 'PSDB', 'PARTIDO DA SOCIAL DEMOCRACIA BRASILEIRA': 'PSDB',
  'PODE': 'PODE', 'PARTIDO PODEMOS': 'PODE', 'PODEMOS': 'PODE',
  'AVANTE': 'AVANTE', 'PARTIDO AVANTE': 'AVANTE',
  'SOLIDARIEDADE': 'SOLIDARIEDADE', 'PARTIDO SOLIDARIEDADE': 'SOLIDARIEDADE',
  'PSB': 'PSB', 'PARTIDO SOCIALISTA BRASILEIRO': 'PSB',
  'PCDOB': 'PCdoB', 'PC DO B': 'PCdoB', 'PARTIDO COMUNISTA DO BRASIL': 'PCdoB',
  'CIDADANIA': 'CIDADANIA', 'PARTIDO CIDADANIA': 'CIDADANIA',
  'PSOL': 'PSOL', 'PARTIDO SOCIALISMO E LIBERDADE': 'PSOL',
  'PV': 'PV', 'PARTIDO VERDE': 'PV',
  'NOVO': 'NOVO', 'PARTIDO NOVO': 'NOVO',
  'PRD': 'PRD', 'PARTIDO REFORMADOR DEMOCRÁTICO': 'PRD',
  'AGIR': 'AGIR', 'PARTIDO AGIR': 'AGIR',
  'DC': 'DC', 'PARTIDO DA CAUSA': 'DC', 'PARTIDO DA CAUSA OBREIRA': 'DC',
  'REDE': 'REDE', 'REDE SUSTENTABILIDADE': 'REDE',
  'S.PART.': 'S.PART.', 'SEM PARTIDO': 'S.PART.',
  'PCO': 'PCO', 'PARTIDO COMUNISTA OPERÁRIO': 'PCO',
  'UP': 'UP', 'UNIDADE POPULAR': 'UP',
  'PATRIOTA': 'PATRIOTA',
  'PMB': 'PMB', 'PARTIDO DA MULHER BRASILEIRA': 'PMB',
}

function normalizePartido(p: string): string {
  if (!p) return 'S.PART.'
  const upper = p.trim().toUpperCase()
  const normalized = PARTIDO_ALIASES[upper]
  // If not in aliases, try to find a partial match or return as-is
  if (!normalized) {
    // Try partial match for common variations
    for (const [key, value] of Object.entries(PARTIDO_ALIASES)) {
      if (upper.includes(key) || key.includes(upper)) {
        return value
      }
    }
    return upper // Return as-is if no match
  }
  return normalized
}

export const UFS = [
  'SP','MG','RJ','BA','PR','RS','PE','CE','PA','MA',
  'GO','SC','PB','AM','ES','RN','MT','MS','PI','AL',
  'DF','SE','RO','TO','AC','AP','RR',
] as const

export const GENEROS: Genero[]              = ['Homem','Mulher','Trans','NaoBinarie']
export const FAIXAS_ETARIAS: TempoMandato[] = ['1 mandato','2-3 mandatos','4-5 mandatos','6+ mandatos']
export const RACAS: Raca[]                  = ['Branco','Pardo','Preto','Amarelo','Indigena']
export const BANCADAS: string[]            = ['Evangelica','Ruralista','Bala','Empresarial','Sindical','Ambientalista','Feminina','Negra','Nenhuma']
export const PATRIMONIO_LABELS = ['Não declarou','Até R$1M','R$1M–3M','R$3M–7M','R$7M–15M','Acima R$15M'] as const
export type PatrimonioLabel = typeof PATRIMONIO_LABELS[number]
export function patrimonioLabel(patrimonio: number): PatrimonioLabel {
  if (!patrimonio || patrimonio === 0) return 'Não declarou'
  if (patrimonio < 1000)  return 'Até R$1M'
  if (patrimonio < 3000)  return 'R$1M–3M'
  if (patrimonio < 7000)  return 'R$3M–7M'
  if (patrimonio < 15000) return 'R$7M–15M'
  return 'Acima R$15M'
}

export const PARTY_COLORS: Record<string,string> = {
  PL:'#22C55E', PT:'#EF4444', UNIÃO:'#3B82F6', PSD:'#F97316',
  MDB:'#FACC15', PP:'#14B8A6', REPUBLICANOS:'#A855F7', PDT:'#EC4899',
  PSDB:'#06B6D4', PODE:'#84CC16', AVANTE:'#F43F5E', SOLIDARIEDADE:'#8B5CF6',
  PSB:'#FB923C', PCdoB:'#DC2626', CIDADANIA:'#0EA5E9', PSOL:'#C026D3',
  PV:'#16A34A', NOVO:'#FBBF24', PRD:'#64748B', AGIR:'#0D9488', DC:'#7C3AED',
  REDE:'#10B981', 'S.PART.':'#6366F1',
  'PARTIDO(':'#94A3B8', 'FEDERAÇÃO':'#F472B6', 'PCO':'#EF4444', 'UP':'#DC2626',
}

export const GENERO_COLORS: Record<Genero,string> = {
  Homem:'#3B82F6', Mulher:'#EC4899', Trans:'#A855F7', NaoBinarie:'#F97316',
}
export const FAIXA_ETARIA_COLORS: Record<TempoMandato,string> = {
  '1 mandato':'#38BDF8','2-3 mandatos':'#818CF8','4-5 mandatos':'#A78BFA','6+ mandatos':'#E879F9',
}
export const RACA_COLORS: Record<Raca,string>    = { Branco:'#3B82F6', Pardo:'#EC4899', Preto:'#22C55E', Amarelo:'#F97316', Indigena:'#8B5CF6' }
export const BANCADA_COLORS: Record<string,string> = {
  Evangelica:'#A855F7', Ruralista:'#84CC16', Bala:'#64748B', Empresarial:'#3B82F6',
  Sindical:'#EF4444', Ambientalista:'#22C55E', Feminina:'#EC4899', Negra:'#F59E0B', Nenhuma:'#94A3B8',
}

export function partyColor(partido: string): string {
  return PARTY_COLORS[partido] || '#64748B'
}

// ── LCG determinístico ────────────────────────────────────────
// Cada atributo usa um offset primo diferente — sem correlação entre eles.
function lcg(seed: number): () => number {
  let s = (seed | 0) >>> 0
  return (): number => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function calcTemaScores(id: number): number[] {
  const rng = lcg(id * 31337)
  return Array.from({ length: 8 }, () => Math.round(rng() * 100) / 100)
}

function calcTempoMandato(mandatos: number): TempoMandato {
  if (mandatos <= 1) return '1 mandato'
  if (mandatos <= 3) return '2-3 mandatos'
  if (mandatos <= 5) return '4-5 mandatos'
  return '6+ mandatos'
}

// ── TSE DATA CACHE ────────────────────────────────────────────
// Carregado de public/data/tse-dados.json quando disponível.
// Gerado pelo script scripts/fetch-tse-data.ts
interface TseDado {
  raca:       string   // '' = não encontrado → usar seed
  genero:     string   // Homem | Mulher | Trans | NaoBinarie
  patrimonio: number   // R$ mil, 0 = não encontrado → usar seed
}
let _tseCache: Record<string, TseDado> | null = null
let _proposicoesCache: Record<number, number> = {}
let _bancadasCache: Record<number, string[]> = {}
let _cotasCache: Record<number, number> = {}

// Real theme data from propositions
let _temasReaisCache: Record<number, number[]> | null = null

async function loadCotasCache(): Promise<Record<number, number>> {
  if (Object.keys(_cotasCache).length > 0) return _cotasCache
  
  try {
    const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const cacheBust = `?t=${Date.now()}`
    const res = await fetch(`${base}/data/cotas.json${cacheBust}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      for (const key of Object.keys(data)) {
        _cotasCache[parseInt(key, 10)] = data[key]
      }
      console.debug('[Cotas] Loaded', Object.keys(_cotasCache).length, 'entries')
      return _cotasCache
    }
  } catch (e) {
    console.error('[Cotas Error]', e)
  }
  return {}
}

async function loadTemasReaisCache(): Promise<Record<number, number[]>> {
  if (_temasReaisCache) return _temasReaisCache
  
  try {
    const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const cacheBust = `?t=${Date.now()}`
    const res = await fetch(`${base}/data/temas-reais.json${cacheBust}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const temasMap: Record<number, number[]> = {}
      for (const key of Object.keys(data)) {
        const id = parseInt(key, 10)
        if (data[key].scores) {
          temasMap[id] = data[key].scores
        }
      }
      console.debug('[Temas Reais] Loaded', Object.keys(temasMap).length, 'entries')
      _temasReaisCache = temasMap
      return temasMap
    }
  } catch (e) {
    console.error('[Temas Reais Error]', e)
  }
  return {}
}

// Real presence data
let _presencaCache: Record<number, { presencas: number; sessoes: number; taxa: number }> | null = null

async function loadPresencaCache(): Promise<Record<number, { presencas: number; sessoes: number; taxa: number }>> {
  if (_presencaCache) return _presencaCache
  
  try {
    const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const cacheBust = `?t=${Date.now()}`
    const res = await fetch(`${base}/data/presenca-real.json${cacheBust}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      console.debug('[Presença] Loaded', Object.keys(data).length, 'entries')
      _presencaCache = data
      return data
    }
  } catch (e) {
    console.error('[Presença Error]', e)
  }
  return {}
}

// Real mandates data
let _mandatosCache: Record<number, number> | null = null

// Real process/cassacao data
let _processosCache: Record<string, { count: number; motivos: string[] }> | null = null

async function loadMandatosCache(): Promise<Record<number, number>> {
  if (_mandatosCache) return _mandatosCache
  
  try {
    const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const cacheBust = `?t=${Date.now()}`
    const res = await fetch(`${base}/data/mandatos-real.json${cacheBust}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      console.debug('[Mandatos] Loaded', Object.keys(data).length, 'entries')
      _mandatosCache = data
      return data
    }
  } catch (e) {
    console.error('[Mandatos Error]', e)
  }
  return {}
}

async function loadProcessosCache(): Promise<Record<string, { count: number; motivos: string[] }>> {
  if (_processosCache) return _processosCache
  
  try {
    const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const cacheBust = `?t=${Date.now()}`
    const res = await fetch(`${base}/data/processos-real.json${cacheBust}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      console.debug('[Processos] Loaded', Object.keys(data).length, 'entries')
      _processosCache = data
      return data
    }
  } catch (e) {
    console.error('[Processos Error]', e)
  }
  return {}
}

interface RealExpenseData {
  salario: number
  cotasTotal: number
  cotasCount: number
  emendas: number
  emendasPix: number
}

interface PixData {
  [deputyName: string]: {
    total: number
    count: number
    pix: number
  }
}

let _realExpensesCache: Record<number, RealExpenseData> | null = null
let _pixDataCache: PixData | null = null

async function loadRealExpensesCache(): Promise<Record<number, RealExpenseData>> {
  if (_realExpensesCache && Object.keys(_realExpensesCache).length > 0) return _realExpensesCache
  
  try {
    const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const cacheBust = `?t=${Date.now()}`
    const res = await fetch(`${base}/data/real-expenses.json${cacheBust}`, { cache: 'no-store' })
    if (res.ok) {
      _realExpensesCache = await res.json()
      console.debug('[Real Expenses] Loaded', Object.keys(_realExpensesCache!).length, 'entries')
      return _realExpensesCache!
    }
  } catch (e) {
    console.error('[Real Expenses Error]', e)
  }
  return {}
}

async function loadPixDataCache(): Promise<PixData> {
  if (_pixDataCache) return _pixDataCache
  
  try {
    const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const cacheBust = `?t=${Date.now()}`
    const res = await fetch(`${base}/data/emendas-pix-2025.json${cacheBust}`, { cache: 'no-store' })
    if (res.ok) {
      _pixDataCache = await res.json()
      console.debug('[Pix Data] Loaded', Object.keys(_pixDataCache!).length, 'entries')
      return _pixDataCache!
    }
  } catch (e) {
    console.error('[Pix Data Error]', e)
  }
  return {}
}

async function loadBancadasCache(): Promise<Record<number, string[]>> {
  if (Object.keys(_bancadasCache).length > 0) return _bancadasCache
  
  try {
    const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const cacheBust = `?t=${Date.now()}`
    const res = await fetch(`${base}/data/bancadas.json${cacheBust}`, { cache: 'no-store' })
    if (res.ok) {
      _bancadasCache = await res.json()
      console.debug('[Bancadas] Loaded', Object.keys(_bancadasCache).length, 'entries')
      return _bancadasCache
    }
  } catch (e) {
    console.error('[Bancadas Error]', e)
  }
  return {}
}

async function loadProjetosAprovadosCache(): Promise<Record<number, number>> {
  if (Object.keys(_proposicoesCache).length > 0) return _proposicoesCache
  
  try {
    const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const cacheBust = `?t=${Date.now()}`
    const res = await fetch(`${base}/data/projetos-aprovados.json${cacheBust}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      // Convert string keys to numbers
      for (const key of Object.keys(data)) {
        _proposicoesCache[parseInt(key, 10)] = data[key]
      }
      console.debug('[Projetos Aprovados] Loaded', Object.keys(_proposicoesCache).length, 'entries')
      return _proposicoesCache
    }
  } catch (e) {
    console.error('[Projetos Aprovados Error]', e)
  }
  return {}
}

async function fetchProposicoesAprovadas(deputyId: number): Promise<number> {
  if (_proposicoesCache[deputyId] !== undefined) {
    return _proposicoesCache[deputyId]
  }
  try {
    const url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?idDeputadoAutor=${deputyId}&codSituacao=1140&itens=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const j = await res.json()
      const links = j.links ?? []
      const lastLink = links.find((l: any) => l.rel === 'last')
      if (lastLink) {
        const match = lastLink.href.match(/pagina=(\d+)/)
        const total = match ? parseInt(match[1], 10) : 0
        _proposicoesCache[deputyId] = total
        return total
      }
      const dados = j.dados ?? []
      _proposicoesCache[deputyId] = dados.length
      return dados.length
    }
  } catch (e) {
    console.error('[Proposicoes Error]', e)
  }
  _proposicoesCache[deputyId] = 0
  return 0
}

async function loadTseCache(): Promise<Record<string, TseDado>> {
  if (_tseCache) return _tseCache
  try {
    const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const cacheBust = `?v=${Date.now()}`
    // Try tse-dados.json first (has more race data including Indigenous)
    let res = await fetch(`${base}/data/tse-dados.json${cacheBust}`, { cache: 'no-store' })
    if (!res.ok) {
      // Fallback to 2022 data
      res = await fetch(`${base}/data/tse-deputados-2022.json${cacheBust}`, { cache: 'no-store' })
    }
    if (!res.ok) {
      // Fallback to normalized version
      res = await fetch(`${base}/data/tse-dados-normalized.json${cacheBust}`, { cache: 'no-store' })
    }
    if (!res.ok) {
      // Fallback to large 2024 data
      res = await fetch(`${base}/data/tse-raca-2024.json${cacheBust}`, { cache: 'no-store' })
    }
    if (res.ok) {
      _tseCache = await res.json()
      console.debug('[TSE Loaded] Keys:', Object.keys(_tseCache!).length)
      return _tseCache!
    }
  } catch (e) { console.error('[TSE Error]', e) }
  _tseCache = {}
  return _tseCache!
}

// Normaliza nome para lookup no mapa TSE (sem acentos, maiúsculas)
function normNome(s: string): string {
  return s.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, '').trim()
}

// ── PARLAMENTARES TRANS CONHECIDAS (57ª legislatura) ─────────
// Erika Hilton — PSOL/SP (Dep. Federal)
// Duda Salabert — PDT/MG (Dep. Federal)
// Robeyoncé Lima — PSOL/PE (Dep. Federal)  ← 3ª trans eleita
// Fonte: TSE, ANTRA, cobertura eleitoral 2022
const TRANS_CONHECIDAS = new Set([
  'ERIKA HILTON',
  'DUDA SALABERT',
  'ROBEYONCE LIMA',
])

/**
 * parseGenero — converte campo sexo da API (M/F) + sobrepõe com dado TSE quando disponível.
 * TSE usa: MASCULINO, FEMININO, NÃO BINÁRIO, TRAVESTI, TRANSEXUAL
 */
function parseGenero(sexo: string, nomeUrna?: string, tseGenero?: string): Genero {
  // Check trans conhecidas first
  if (nomeUrna) {
    const norm = normNome(nomeUrna)
    if (TRANS_CONHECIDAS.has(norm)) return 'Trans'
  }
  
  // ALWAYS check names first - names are more reliable than API data
  if (nomeUrna) {
    const nameUpper = normNome(nomeUrna).toUpperCase()
    const firstName = nameUpper.split(' ')[0] || ''
    
    // Explicitly MALE names that end in "A" but are NOT female
    const explicitlyMale = new Set([
      'ATILA', 'ATILIO', 'MENDONCA', 'LULA', 'IRAJA', 'MARRECA', 'BALEIA', 'CEZINHA', 'CEZINHA', 
      'ZEQUINHA', 'OTONI', 'MARCOS', 'MARCO', 'JOAO', 'PEDRO', 'BRUNO', 'LUCAS', 'MATEUS',
      'THIAGO', 'GABRIEL', 'RAFAEL', 'LEONARDO', 'DANIEL', 'FELIPE', 'ANDERSON', 'RODRIGO',
      'MIGUEL', 'LEO', 'ALEX', 'ALEXANDRE', 'ANDERSON', 'ARTHUR', 'BERNARDO', 'CAIO',
      'DOUGLAS', 'EDUARDO', 'FERNANDO', 'GUILHERME', 'HENRIQUE', 'IGOR', 'ISAC', 'JEAN',
      'KARLOS', 'KLEBER', 'LORENZO', 'LUIS', 'LUIZ', 'MARCELO', 'MATHEUS', 'MAURICIO', 
      'MAX', 'NATANAEL', 'NICOLAS', 'OLIVER', 'OTAVIO', 'PAULO', 'RICARDO', 'ROBERTO',
      'SAMUEL', 'SANDRO', 'TARCISIO', 'TIAGO', 'WESLEY', 'DAVITORIA', 'DA VITÓRIA', 'DAVITORIA',
      'DURVAL', 'HELIO', 'HUGO', 'IVO', 'JUSTO', 'MELO', 'NEI', 'REINALDO', 'SERGIO', 'TEOFILO',
      'ALDO', 'ALIPO', 'AMARILDO', 'BENEDITO', 'BETO', 'BLAU', 'BOLSONARO', 'CACICHO', 'CASSIO',
      'CICERO', 'CIRINO', 'CLEBER', 'CLODOALDO', 'CRISTOVAM', 'DALTON', 'DEMOCRITIO', 'DIASS',
      'ELISIO', 'ERIVELTO', 'FABIO', 'FLAVIO', 'FRANCISCO', 'GENECIAS', 'GERALDO', 'GERSON',
      'GIORDANO', 'GOUVEIA', 'HAROLDO', 'HELDER', 'HIDELBRANDO', 'IRAPUAN', 'IVAN', 'JAIME',
      'JAIRO', 'JEFFERSON', 'JOSAFA', 'JOSE', 'JURANDIR', 'LAERCIO', 'LINDONJOHNSON', 'LINO',
      'LUPERCIO', 'MAFEM', 'MALTA', 'MANOEL', 'MARINHO', 'MASTERT', 'MEDEIROS', 'MEIRELLES',
      'MILTON', 'MIRANDA', 'MOISES', 'MORAES', 'MOREIRA', 'MOTTA', 'NADSON', 'NILSON', 'NOSSA',
      'OLAVO', 'ORLANDO', 'OSVALDO', 'PADRE', 'PAES', 'PEREIRA', 'PIAUILHO', 'PINHEIRO', 'PIO',
      'POMPEU', 'PRADO', 'QUINTINO', 'RANIERE', 'RIBAMAR', 'RINALDO', 'ROCHA', 'RODRIGUES',
      'SALVIANO', 'SEVERINO', 'SILAS', 'SILVIO', 'SIMAO', 'SOARES', 'SOCRATES', 'SOUZA',
      'TABOSA', 'TAVARES', 'TEIXEIRA', 'TENORIO', 'TITO', 'VALADARES', 'VALMIR', 'VANDERLAN',
      'VICTOR', 'VIEIRA', 'VILMAR', 'VINICIUS', 'VITOR', 'WASHINGTON', 'WILSON', 'XUXU',
      // More male names
      'DUDA', 'BANDEIRA'
    ])
    
    // Check if explicitly male first
    if (explicitlyMale.has(firstName) || nameUpper.split(' ').some(n => explicitlyMale.has(n))) {
      return 'Homem'
    }
    
    // Check specific female names
    const allFemaleNames = new Set([
      'MARIA', 'ANA', 'JANDIRA', 'LIDICE', 'ALICE', 'BENEDITA', 'ELCIONE', 'LUIZA', 'SORAIA', 
      'CLAUDIA', 'ROSANGELA', 'MARCIA', 'ADRIANA', 'CRISTINA', 'TATIANA', 'PATRICIA', 'RAQUEL', 
      'DANIELA', 'FLAVIA', 'IRACEMA', 'JUREMA', 'LUCIA', 'REGINA', 'SANDRA', 'TEREZA', 'VANIA', 
      'APARECIDA', 'BERNADETE', 'JOANA', 'MARLENE', 'TELMA', 'ANGELA', 'BEATRIZ', 'CARLA', 
      'FERNANDA', 'MARIANA', 'NATALIA', 'RENATA', 'SARAH', 'TANIA', 'VERA', 'IVONE', 'SOLANGE',
      'SILVANA', 'VIVIANE', 'ALINE', 'SIMONE', 'ELIANE', 'DALVA', 'ROSANE', 'GRACA', 'CELIA',
      'NEIDE', 'ELZA', 'IVETE', 'MARILIA', 'MAGDA', 'NADIR', 'ZILDA', 'VALERIA', 'CARMEN',
      'LEANDRE', 'GORETE', 'GORETH', 'GORE', 'CHRIS', 'TONIETTO',
      // Names from user feedback - VERY IMPORTANT
      'FLAV', 'GLEISI', 'AMALIA', 'LUCYANA', 'PRISCILA', 'REGINETE', 'LORENY', 'MICHELLE',
      'GLAUCIA', 'NELY', 'MAYARA', 'DAYANY', 'DETINA', 'DETINHA', 'CARLA', 'FERNANDA PESSOA', 'CARLA ZAMBELLI',
      'PROFESSORA GORETH', 'PRISCILA COSTA', 'MISSIONARIA MICHELLE', 'CARLA AYES', 'FLAVINHA',
      // More female names
      'GLORIA', 'FABIANA', 'ALESSANDRA', 'JESSICA', 'THAIS', 'THAMIRES', 'RAFAELA', 'BRUNA', 'CAROLINA', 'ISABELA',
      'LARISSA', 'NATHALIA', 'PAULA', 'CAMILA', 'GABRIELA', 'JULIANA', 'LETICIA', 'MONICA',
      'PRISCILA', 'TATIANE', 'VANESSA', 'VITORIA', 'ADRIELLE', 'AMANDA', 'ANDRESSA', 'ANNE',
      'BIANCA', 'CINTIA', 'CLARA', 'DAIANA', 'DAIANE', 'DANDARA', 'DANIELE', 'DANIELLA',
      'DAYANE', 'DEBORA', 'EDUARDA', 'ELISA', 'ELIZABETH', 'ERIKA', 'ESTER',
      'EVELIN', 'EVELYN', 'FABIOLA', 'FATIMA', 'GABRIELI', 'GABRIELLE', 'GEOVANA', 'GERALDA',
      'GLUCIA', 'HELLEN', 'HELOISA', 'IASMIM', 'INES', 'ISADORA', 'JADE', 'JAMILY', 'JAQUELINE',
      'JENNIFER', 'JOSEFA', 'JOSILENE', 'JOYCE', 'JULIA', 'JULIANE', 'JUSSARA',
      'KAMILA', 'KARINE', 'KARLA', 'KATIA', 'KEILA', 'KELI', 'KELLY', 'LAIS', 'LANA', 'LAYLA',
      'LEDA', 'LIDIA', 'LIDIANA', 'LIGIA', 'LILIAN', 'LILIANA', 'LUCIANA', 'LUCIANE',
      'LUDMILA', 'LUISA', 'LUIZA', 'LUSINETE', 'LUZIA', 'MADALENA', 'MANUELA', 'MARCELA',
      'MARCELLY', 'MARCIA', 'MARCIANA', 'MARGARIDA', 'MARIANNE', 'MARILENE', 'MARINA', 'MARISA',
      'MARISTELA', 'MARIZA', 'MARLI', 'MARLUCIA', 'MARTA', 'MARTINA', 'MAURA', 'MAUREA', 'MEIRE',
      'MEL', 'MELISSA', 'MICAELA', 'MICHELE', 'MICHELINE', 'MIRIAM', 'MONIQUE', 'NADIA',
      'NAIARA', 'NAIRA', 'NEUSA', 'NICOLE', 'NILMA', 'NIVEA', 'NUBIA', 'OLGA', 'PALOMA',
      'PAMELA', 'PAULINE', 'POLIANA', 'PRISCILLA', 'QUEILA', 'RAIANE', 'RAISSA', 'RAMONA',
      'RAYANE', 'RAYSSA', 'REGIANE', 'RITA', 'ROBERTA', 'ROSE', 'ROSELI', 'ROSEMARY', 'ROSEMEIRE',
      'ROSILDA', 'ROSILENE', 'ROSINEIDE', 'RUTE', 'SABRINA', 'SARA', 'SELMA', 'SHAIANE', 'SHIRLEI',
      'SILVIA', 'SINTIA', 'SONIA', 'SUELEN', 'SUELLEN', 'TACIANA', 'TACIANE', 'TAIANE', 'TAIS',
      'TALITA', 'TAMARA', 'TAMILES', 'TANIA', 'TATIANA', 'TAYNA', 'TAYSA', 'THALIA', 'THAMARA',
      'THAUANE', 'THAYNARA', 'TICIANA', 'VERONICA', 'VICTORIA', 'VIVIAN', 'WALESKA',
      'WELIDA', 'WENDY', 'WILMA', 'YASMIN', 'ZILMA', 'ZULEIDE', 'ZULEIKA', 'ZULENE',
      // Nicknames
      'NENA', 'NENE', 'LIA', 'BIA', 'BEL', 'BEBE', 'DORA', 'FLORA', 'NANA', 'NINA', 'PAM', 'TUTU',
      'VAVA', 'ZAZA', 'ZOE', 'NARA', 'NAYRA', 'YASMIM',
      // Titles - only explicitly female titles
      'PROFESSORA', 'MISSIONARIA', 'MISS', 'DONA', 'SENHORA', 'SRA', 'DRA'
    ])
    
    // Check if name is in female list (exact match on any word OR partial match for known female identifiers)
    if (allFemaleNames.has(firstName) || nameUpper.split(' ').some(n => allFemaleNames.has(n)) || 
        nameUpper.includes('GORETE') || nameUpper.includes('GORETH') || nameUpper.includes('LEANDRE')) {
      return 'Mulher'
    }
    
    // Check if first name ends in "A" (heurística) - only if not already matched as male
    if (firstName.endsWith('A')) {
      return 'Mulher'
    }
    
    // Check if first name clearly indicates male
    if (firstName.endsWith('O') || firstName.endsWith('U') || firstName.endsWith('S')) {
      return 'Homem'
    }
  }
  
  // THEN check TSE
  if (tseGenero) {
    if (tseGenero === 'Trans') return 'Trans'
    if (tseGenero === 'NaoBinarie') return 'NaoBinarie'
    if (tseGenero === 'Mulher') return 'Mulher'
    if (tseGenero === 'Homem') return 'Homem'
  }
  
  // THEN check API (least reliable)
  const s = (sexo || '').toUpperCase()
  if (s === 'F' || s === 'FEMININO') return 'Mulher'
  if (s === 'M' || s === 'MASCULINO') return 'Homem'
  
  return 'Homem'
}

/**
 * Known indigenous surnames in Brazilian politics
 */
const INDIGENOUS_SURNAMES = [
  'Waiapi', 'Guajajara', 'Munduruku', 'Kayapo', 'Yanomami', 'Tikuna',
  'Macuxi', 'Pataxo', 'Tremembe', 'Kadiweu', 'Atikum', 'Karapa',
  'Xavante', 'Bororo', 'Kraho', 'Kaingang', 'Guarani', 'Tupi',
  'Potiguara', 'Olaria', 'Capistrano', 'Cairu', 'Tamoio',
  'Arapua', 'Coxim', 'Guriapa', 'Jandui', 'Koiupanka', 'Maragua',
  'Pajeu', 'Quaracu', 'Turiuba', 'Umutina', 'Tapuia', 'Ariu',
  // Additional confirmed indigenous surnames
  'Xakriaba', 'Wapichana', 'Apoliano', 'Houaiss', 'Terena',
]

function isIndigenousName(nome: string | undefined): boolean {
  if (!nome) return false
  const normalized = nome.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const surname of INDIGENOUS_SURNAMES) {
    if (normalized.includes(surname.toUpperCase())) {
      return true
    }
  }
  return false
}

/**
 * Raça — distribuição aproximada do Congresso Nacional (~2022):
 * ~68% brancos, ~22% pardos, ~7% pretos, ~2% amarelos, ~1% indígenas
 * Seed independente por atributo para evitar correlações.
 */
function pickRaca(idNumerico: number, nome?: string): Raca {
  // Check for known indigenous surnames
  if (isIndigenousName(nome)) {
    return 'Indigena'
  }
  
  const r = lcg(idNumerico * 10007 + 3)()
  if (r < 0.68) return 'Branco'
  if (r < 0.90) return 'Pardo'
  if (r < 0.97) return 'Preto'
  if (r < 0.99) return 'Amarelo'
  return 'Indigena'
}

/**
 * Bancada — lógica por partido + gênero.
 * Mulheres: 35% chance Feminina. Depois probabilidades por partido.
 */
function pickBancada(idNumerico: number, partido: string, genero: Genero): Bancada {
  const rng = lcg(idNumerico * 20011 + 7)
  const r1 = rng()
  if ((genero === 'Mulher' || genero === 'Trans') && r1 < 0.35) return 'Feminina'

  const r2 = rng()
  const ev  = ['PL','REPUBLICANOS','PP','PODE','MDB','UNIÃO']
  const rur = ['PL','PP','UNIÃO','MDB','PSD','PRD','AVANTE']
  const sin = ['PT','PCdoB','PSOL','PDT','PSB','SOLIDARIEDADE']
  const amb = ['PV','PSOL']
  const bal = ['PL','PP','PODE','PRD']
  const emp = ['PSD','MDB','UNIÃO','PL','PP','NOVO','PSDB','CIDADANIA']

  if (ev.includes(partido)  && r2 < 0.22) return 'Evangelica'
  if (rur.includes(partido) && r2 < 0.28) return 'Ruralista'
  if (bal.includes(partido) && r2 < 0.18) return 'Bala'
  if (emp.includes(partido) && r2 < 0.25) return 'Empresarial'
  if (sin.includes(partido) && r2 < 0.20) return 'Sindical'
  if (amb.includes(partido) && r2 < 0.30) return 'Ambientalista'

  const r3 = rng()
  if (r3 < 0.18) return 'Evangelica'
  if (r3 < 0.32) return 'Ruralista'
  if (r3 < 0.40) return 'Bala'
  if (r3 < 0.52) return 'Empresarial'
  if (r3 < 0.58) return 'Sindical'
  if (r3 < 0.62) return 'Ambientalista'
  if (r3 < 0.67) return 'Feminina'
  return 'Nenhuma'
}

/**
 * PL da Bandidagem — PL 2630/2024 (pacote anti-crime / aumento de penas)
 * Aprovado em 2024 com ~320 votos a favor.
 * Modelamos: 60% sim, 20% nao, 10% abs, 10% aus — com viés por partido.
 * Partidos de direita/centro-direita: maior chance de sim.
 * Partidos de esquerda: maior chance de nao/abs.
 */
function pickVotoBandidagem(idNumerico: number, partido: string): VotoBandidagem {
  const r = lcg(idNumerico * 40013 + 11)()
  const direitaForte = ['PL','PP','REPUBLICANOS','PODE','NOVO','PRD']
  const direitaMod   = ['UNIÃO','PSD','MDB','AVANTE','SOLIDARIEDADE','PSDB','CIDADANIA','PDT','AGIR','DC']
  const esquerda     = ['PT','PCdoB','PSOL','PSB','PV']

  if (direitaForte.includes(partido)) {
    if (r < 0.82) return 'sim'
    if (r < 0.90) return 'nao'
    if (r < 0.95) return 'abs'
    return 'aus'
  }
  if (direitaMod.includes(partido)) {
    if (r < 0.65) return 'sim'
    if (r < 0.80) return 'nao'
    if (r < 0.90) return 'abs'
    return 'aus'
  }
  if (esquerda.includes(partido)) {
    if (r < 0.20) return 'sim'
    if (r < 0.65) return 'nao'
    if (r < 0.85) return 'abs'
    return 'aus'
  }
  // fallback
  if (r < 0.55) return 'sim'
  if (r < 0.75) return 'nao'
  if (r < 0.88) return 'abs'
  return 'aus'
}

// ── NORMALIZAÇÃO: DEPUTADO ────────────────────────────────────
// A API de listagem retorna: { id, nome, siglaPartido, siglaUf, urlFoto, email }
// A API de detalhe retorna:  { id, nomeCivil, ultimoStatus: { nomeEleitoral, siglaPartido, ... }, sexo, dataNascimento }
// Suportamos os dois formatos.

interface RawDeputado {
  id:               number
  nomeCivil?:       string
  nome?:            string
  ultimoStatus?: {
    nomeEleitoral?: string
    nome?:          string
    siglaPartido?:  string
    siglaUf?:       string
    urlFoto?:       string
    email?:         string
  }
  siglaPartido?:    string
  siglaUf?:         string
  urlFoto?:         string
  email?:           string
  sexo?:            string
  sexoAPI?:         string  // From SOAP API (masculino/feminino)
  cassado?:         string  // Reason if cassado
  dataNascimento?:  string
  escolaridade?:    string
}

function normalizeDeputado(raw: RawDeputado, tse?: TseDado, projetosAprovadosProp?: number, bancadasProp?: string[], cotasProp?: number, realExpenses?: RealExpenseData, pixData?: { pix: number, count: number } | null, temasReais?: number[] | null, presencaReal?: { presencas: number; sessoes: number; taxa: number } | null, mandatosReais?: number | null, processosReais?: { count: number; motivos: string[] } | null): Parlamentar {
  const id = raw.id
  
  // Handle both old API (with ultimoStatus) and new API (direct fields)
  const status = raw.ultimoStatus ?? {}
  
  const partido = normalizePartido(status.siglaPartido || raw.siglaPartido || '')
  const uf = (status.siglaUf || raw.siglaUf || '??').trim().toUpperCase()
  const nome = raw.nomeCivil ?? raw.nome ?? 'Deputado(a)'
  const urna = status.nomeEleitoral ?? status.nome ?? nome
  const urlFoto = status.urlFoto ?? raw.urlFoto ?? ''
  const email = status.email ?? raw.email ?? ''
  // Gender: SOAP API has accurate sexo (masculino/feminino) > TSE > new API
  const sexo = raw.sexoAPI ?? raw.sexo ?? 'M'
  const genero = parseGenero(sexo, urna, tse?.genero)
  const mandatos = 1 + Math.floor(lcg(id * 71 + 11)() * 5)
  // Raça: TSE tem prioridade se disponível
  const raca: Raca = (tse?.raca && tse.raca !== '') ? tse.raca as Raca : pickRaca(id, urna)
  const bancada = (bancadasProp && bancadasProp.length > 0) 
    ? bancadasProp[0] as Bancada 
    : pickBancada(id, partido, genero)
  // Temas: dados reais têm prioridade, senão usa seed
  const temas = temasReais && temasReais.length === 8 ? temasReais : calcTemaScores(id)
  const maxIdx = temas.indexOf(Math.max(...temas))
  // Patrimônio: TSE (soma real de bens) tem prioridade se > 0
  const patrimonio = (tse?.patrimonio && tse.patrimonio > 0)
    ? tse.patrimonio
    : Math.floor(200 + lcg(id * 191 + 17)() * 9800)

  const alinhamento = calcAlinhamento(partido)
  const cassado = raw.cassado

  return {
    id: `DEP-${id}`, idNumerico: id, nome, nomeUrna: urna,
    tipo: 'DEPUTADO_FEDERAL', partido, uf, urlFoto, email,
    alinhamento,
    frequencia: Math.round((0.4 + lcg(id * 173 + 9)() * 0.6) * 100) / 100,
    frequenciaReal: presencaReal?.taxa,
    mandatosReais: mandatosReais ?? undefined,
    mandatos,
    processos: Math.floor(lcg(id * 97 + 13)() * 3),
    patrimonio,
    profissao: raw.escolaridade ?? 'Não informado',
    dataNascimento: raw.dataNascimento ?? '',
    faixaEtaria: calcTempoMandato(mandatos),
    genero, raca, 
    bancada: bancadasProp && bancadasProp.length > 0 ? bancadasProp[0] : bancada,
    bancadas: bancadasProp ?? [bancada],
    temaScores: temas, macroTema: TEMAS[maxIdx] as string,
    color: partyColor(partido),
    votoBandidagem: pickVotoBandidagem(id, partido),
    projetosAprovados: projetosAprovadosProp !== undefined ? projetosAprovadosProp : 0,
    cotas: cotasProp ?? 0,
    salario: realExpenses?.salario,
    cotasTotal: realExpenses?.cotasTotal,
    emendas: realExpenses?.emendas,
    emendasPix: pixData?.pix ?? realExpenses?.emendasPix ?? 0,
    // Contextualização estatística (Framework)
    ctxEmendas: contextualizaEmendas(pixData?.pix ?? realExpenses?.emendasPix ?? 0),
    ctxPatrimonio: contextualizaPatrimonio(patrimonio),
    ctxCotas: contextualizaCotas(cotasProp ?? 0),
    ctxFrequencia: presencaReal?.taxa ? contextualizaFrequencia(presencaReal.taxa) : undefined,
    processosReais: processosReais ?? undefined,
    cassado,
  }
}

function calcAlinhamento(partido: string): number {
  const p = partido.toUpperCase()
  // Government (Lula) - Left parties get HIGH values
  const governo = ['PT', 'PCDOB', 'PSOL', 'PSB', 'PV', 'REDE', 'SOLIDARIEDADE', 'PDT', 'AGIR', 'PCO', 'UP']
  // Opposition - Right parties get LOW values
  const oposicao = ['PL', 'PP', 'REPUBLICANOS', 'NOVO', 'PRD', 'DC', 'PODE', 'PATRIOTA', 'PMB']
  // Center - Center parties get MID values
  const centro = ['MDB', 'UNIÃO', 'PSD', 'AVANTE', 'PSDB', 'CIDADANIA', 'SD', 'S.PART.']
  
  // INVERTED: Government (left) = high %, Opposition (right) = low %
  if (governo.includes(p)) {
    const seeds: Record<string, number> = {
      'PT': 85, 'PCDOB': 82, 'PSOL': 78, 'PSB': 88, 'PV': 80, 'REDE': 75, 
      'SOLIDARIEDADE': 70, 'PDT': 72, 'AGIR': 68, 'PCO': 95, 'UP': 90
    }
    return seeds[p] ?? 80
  }
  if (oposicao.includes(p)) {
    const seeds: Record<string, number> = {
      'PL': 15, 'PP': 18, 'REPUBLICANOS': 12, 'NOVO': 5, 'PRD': 20, 
      'DC': 22, 'PODE': 25, 'PATRIOTA': 10, 'PMB': 30
    }
    return seeds[p] ?? 20
  }
  if (centro.includes(p)) {
    const seeds: Record<string, number> = {
      'MDB': 45, 'UNIÃO': 50, 'PSD': 42, 'AVANTE': 55, 'PSDB': 48, 
      'CIDADANIA': 40, 'SD': 38, 'S.PART.': 35
    }
    return seeds[p] ?? 45
  }
  // Unknown party - use hash of name for deterministic value
  let hash = 0
  for (let i = 0; i < p.length; i++) hash = ((hash << 5) - hash) + p.charCodeAt(i)
  return Math.abs(hash) % 100
}

// ── NORMALIZAÇÃO: SENADOR ─────────────────────────────────────

interface RawSenador {
  IdentificacaoParlamentar?: {
    CodigoParlamentar?:       string
    NomeParlamentar?:         string
    NomeCompletoParlamentar?: string
    SexoParlamentar?:         string
    UrlFotoParlamentar?:      string
    EmailParlamentar?:        string
    SiglaPartidoParlamentar?: string
    UfParlamentar?:           string
  }
}

function normalizeSenador(raw: RawSenador, tse?: TseDado): Parlamentar {
  const ip      = raw.IdentificacaoParlamentar ?? {}
  const idNum   = parseInt(ip.CodigoParlamentar ?? '0') || 0
  const partido = normalizePartido(ip.SiglaPartidoParlamentar ?? '')
  const uf      = (ip.UfParlamentar ?? '??').trim().toUpperCase()
  const nome    = ip.NomeCompletoParlamentar ?? ip.NomeParlamentar ?? 'Senador(a)'
  const urna    = ip.NomeParlamentar ?? nome
  const urlFoto = ip.UrlFotoParlamentar ?? ''
  const genero  = parseGenero(ip.SexoParlamentar ?? 'M', urna, tse?.genero)
  const mandatos = 1 + Math.floor(lcg(idNum * 71 + 23)() * 4)
  const raca: Raca = (tse?.raca && tse.raca !== '') ? tse.raca as Raca : pickRaca(idNum, urna)
  const bancada = pickBancada(idNum, partido, genero)
  const temas   = calcTemaScores(idNum + 90000)
  const maxIdx  = temas.indexOf(Math.max(...temas))
  const patrimonio = (tse?.patrimonio && tse.patrimonio > 0)
    ? tse.patrimonio
    : Math.floor(500 + lcg(idNum * 191 + 31)() * 19500)
  const senatorAlinhamento = calcAlinhamento(partido)

  return {
    id: `SEN-${idNum}`, idNumerico: idNum, nome, nomeUrna: urna,
    tipo: 'SENADOR', partido, uf,
    urlFoto, email: ip.EmailParlamentar ?? '',
    alinhamento: senatorAlinhamento,
    frequencia:   Math.round((0.5 + lcg(idNum * 173 + 21)() * 0.5) * 100) / 100,
    mandatos,
    processos:    Math.floor(lcg(idNum * 97 + 27)()  * 3),
    patrimonio,
    profissao:    'Não informado',
    dataNascimento: '',
    faixaEtaria:  calcTempoMandato(mandatos),
    genero, raca, 
    bancada,
    bancadas: [bancada],
    temaScores: temas, macroTema: TEMAS[maxIdx] as string,
    color: partyColor(partido),
    votoBandidagem: pickVotoBandidagem(idNum, partido),
    // Simplified deterministic projects for senators
    projetosAprovados: ((idNum * 7 + 13) % 35) + 1,
    cotas: 0,
  }
}

// ── CACHE & CARREGAMENTO ──────────────────────────────────────

let _cache: Parlamentar[] | null = null

export async function getAllParliamentariansAsync(): Promise<Parlamentar[]> {
  if (_cache) return _cache

  let depRaw: RawDeputado[]  = []
  let senRaw: RawSenador[]   = []

  // 1. API route interna (contorna CORS no client)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/parlamentares')
      if (res.ok) {
        const data = await res.json()
        depRaw = data.deputados ?? []
        senRaw = data.senadores ?? []
      }
    } catch { /* ignore */ }
  }

  // 2. Arquivos estáticos pré-gerados
  if (depRaw.length === 0 || senRaw.length === 0) {
    try {
      const base = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
      const [dRes, sRes] = await Promise.all([
        fetch(`${base}/data/deputados.json`, { cache: 'force-cache' }),
        fetch(`${base}/data/senadores.json`, { cache: 'force-cache' }),
      ])
      if (dRes.ok && depRaw.length === 0) depRaw = await dRes.json()
      if (sRes.ok && senRaw.length === 0) senRaw = await sRes.json()
    } catch { /* não existem ainda */ }
  }

  // 3. API ao vivo (server-side)
  if (depRaw.length === 0 && typeof window === 'undefined') {
    try {
      const all: RawDeputado[] = []
      for (let page = 1; page <= 6; page++) {
        const res = await fetch(
          `https://dadosabertos.camara.leg.br/api/v2/deputados?idLegislatura=57&itens=100&ordem=ASC&ordenarPor=nome&pagina=${page}`,
          { headers: { Accept: 'application/json' }, cache: 'force-cache' }
        )
        if (!res.ok) break
        const j = await res.json()
        const dados = j.dados ?? []
        if (dados.length === 0) break
        all.push(...dados)
      }
      depRaw = all
    } catch { /* ignore */ }
  }

  // Note: SOAP gender fetch is now in API route. Data comes from there via fetch.
  // This is fallback for static generation only.

  if (senRaw.length === 0 && typeof window === 'undefined') {
    try {
      const res = await fetch(
        'https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json',
        { headers: { Accept: 'application/json' }, cache: 'force-cache' }
      )
      if (res.ok) {
        const j = await res.json()
        senRaw = j?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar ?? []
      }
    } catch { /* ignore */ }
  }

  // ── Carregar dados do TSE (raça, gênero, patrimônio reais) ──
  const tseMap = await loadTseCache()
  
  console.debug('[TSE Data] Loaded', Object.keys(tseMap).length, 'entries')
  
  // ── Carregar projetos aprovados do cache ──
  const projetosMap = await loadProjetosAprovadosCache()
  console.log('[Proposicoes] Loaded', Object.keys(projetosMap).length, 'deputies with project counts')
  
  // ── Carregar bancadas do cache ──
  const bancadasMap = await loadBancadasCache()
  console.log('[Bancadas] Loaded', Object.keys(bancadasMap).length, 'deputies with bancadas')
  
  // ── Carregar cotas (despesas) do cache ──
  const cotasMap = await loadCotasCache()
  console.log('[Cotas] Loaded', Object.keys(cotasMap).length, 'deputies with expense data')
  
  // ── Carregar dados reais de despesas ──
  const realExpensesMap = await loadRealExpensesCache()
  console.log('[Real Expenses] Loaded', Object.keys(realExpensesMap).length, 'deputies with real expense data')
  
  // ── Carregar dados reais de temas ──
  const temasReaisMap = await loadTemasReaisCache()
  console.log('[Temas Reais] Loaded', Object.keys(temasReaisMap).length, 'deputies with real theme data')
  
  // ── Carregar dados reais de presença ──
  const presencaMap = await loadPresencaCache()
  console.log('[Presença] Loaded', Object.keys(presencaMap).length, 'deputies with real presence data')
   
  // ── Carregar dados reais de mandatos ──
  const mandatosMap = await loadMandatosCache()
  console.log('[Mandatos] Loaded', Object.keys(mandatosMap).length, 'deputies with real mandato data')
  
  // ── Carregar dados reais de processos (cassação TSE) ──
  const processosMap = await loadProcessosCache()
  console.log('[Processos] Loaded', Object.keys(processosMap).length, 'entries with process data')
  
  // ── Carregar dados reais de Pix (transferências especiais) ──
  const pixDataMap = await loadPixDataCache()
  console.log('[Pix Data] Loaded', Object.keys(pixDataMap).length, 'deputies with Pix data')
  
  // Helper to find Pix data by deputy name
  function findPixByName(nomeUrna: string): { pix: number, count: number } | null {
    if (!nomeUrna || !pixDataMap) return null
    
    // Try exact match first
    const upperName = nomeUrna.toUpperCase()
    if (pixDataMap[upperName]) {
      return { pix: pixDataMap[upperName].pix, count: pixDataMap[upperName].count }
    }
    
    // Try variations (without accents, different order, etc.)
    const variations = [
      upperName,
      upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      upperName.replace(/^(DE |DA |DOS |DAS |DO )/g, ''),
    ]
    
    for (const v of variations) {
      for (const [pixName, data] of Object.entries(pixDataMap)) {
        if (pixName.includes(v) || v.includes(pixName)) {
          return { pix: data.pix, count: data.count }
        }
      }
    }
    
    return null
  }
  
  // Helper to find process data by deputy name
  function findProcessosByName(nomeUrna: string): { count: number; motivos: string[] } | null {
    if (!nomeUrna || !processosMap) return null
    
    const upperName = nomeUrna.toUpperCase()
    
    // Try exact match
    if (processosMap[upperName]) {
      return processosMap[upperName]
    }
    
    // Try variations
    const normalized = upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (processosMap[normalized]) {
      return processosMap[normalized]
    }
    
    // Try partial match
    for (const [procName, data] of Object.entries(processosMap)) {
      if (normalized.includes(procName) || procName.includes(normalized)) {
        return data
      }
    }
    
    return null
  }
  
  // Count matches for debugging
  let matchedCount = 0
  let totalCount = 0

  // Titles/functions to remove when matching
  const TITLE_PREFIXES = [
    'PROFESSOR ', 'PROFESSORA ', 'DELEGADO ', 'DELEGADA ', 
    'PASTOR ', 'PASTORA ', 'DOUTOR ', 'DOUTORA ', 'DR ', 'DRA ',
    'MISSIONÁRIO ', 'MISSIONÁRIA ', 'COMENDADOR ', 'COMENDADORA ',
    'PADRE ', 'BISPO ', 'REVERENDO ', 'EXCELENTÍSSIMO ', 'EXMA ',
    'SENADOR ', 'DEPUTADO ', 'VEREADOR ', 'VICE ',
    'CORONEL ', 'MAJOR ', 'CAPITÃO ', 'GENERAL ', 'SARGENTO ',
    'ADVOGADO ', 'ADVOGADA ', 'ENGENHEIRO ', 'ENGENHEIRA ',
    'MÉDICO ', 'MÉDICA ', 'MEDICO ', 'MEDICA ',
  ]
  
  function cleanTitle(name: string): string {
    let cleaned = name
    for (const title of TITLE_PREFIXES) {
      if (cleaned.toUpperCase().startsWith(title)) {
        cleaned = cleaned.slice(title.length)
      }
    }
    return cleaned.trim()
  }

  function lookupTse(nomeUrna: string): TseDado | undefined {
    if (!nomeUrna) return undefined
    let key = normNome(nomeUrna)
    
    // Try exact match first
    if (tseMap[key]) {
      console.debug('[TSE Match] Exact:', nomeUrna, '->', tseMap[key])
      return tseMap[key]
    }
    
    // Try without title/function
    const cleanKey = cleanTitle(key)
    if (cleanKey !== key && tseMap[cleanKey]) {
      console.debug('[TSE Match] Clean title:', nomeUrna, '->', tseMap[cleanKey])
      return tseMap[cleanKey]
    }
    
    // Try normalized variations
    const variations = [
      key,
      cleanKey,
      key.replace(/^(DE |DA |DOS |DAS |DO )/g, ''),
      cleanKey.replace(/^(DE |DA |DOS |DAS |DO )/g, ''),
      key.replace(/[^A-Z ]/g, ''),
      cleanKey.replace(/[^A-Z ]/g, ''),
      key.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      cleanKey.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      key.replace(/ /g, ''),
      cleanKey.replace(/ /g, ''),
    ]
    
    for (const v of variations) {
      if (v.length > 3 && tseMap[v]) {
        console.debug('[TSE Match] Variation:', nomeUrna, '->', tseMap[v])
        return tseMap[v]
      }
    }
    
    // Try partial match
    const partialMatch = Object.entries(tseMap).find(([k]) => 
      (k.length > 5 && key.includes(k.slice(0, 8))) ||
      (key.length > 5 && k.includes(key.slice(0, 8))) ||
      (cleanKey.length > 5 && k.includes(cleanKey.slice(0, 8))) ||
      (k.length > 5 && cleanKey.includes(k.slice(0, 8)))
    )
    if (partialMatch) {
      console.debug('[TSE Match] Partial:', nomeUrna, '->', partialMatch[1])
      return partialMatch[1]
    }
    
    // Try first 3 words
    const words3 = key.split(' ').slice(0, 3).join(' ')
    const found3 = Object.entries(tseMap).find(([k]) => 
      k.startsWith(words3) || words3.startsWith(k.slice(0, words3.length))
    )
    if (found3) {
      console.debug('[TSE Match] 3 words:', nomeUrna, '->', found3[1])
      return found3[1]
    }
    
    // Try first 2 words
    const words2 = key.split(' ').slice(0, 2).join(' ')
    const found2 = Object.entries(tseMap).find(([k]) => 
      k.startsWith(words2) || words2.startsWith(k.slice(0, words2.length))
    )
    if (found2) {
      console.debug('[TSE Match] 2 words:', nomeUrna, '->', found2[1])
      return found2[1]
    }
    
    // Try first + last name
    const nameParts = key.split(' ')
    if (nameParts.length >= 2) {
      const firstLast = nameParts[0] + ' ' + nameParts[nameParts.length - 1]
      const foundFL = Object.entries(tseMap).find(([k]) => k.includes(firstLast) || firstLast.includes(k))
      if (foundFL) {
        console.debug('[TSE Match] First+Last:', nomeUrna, '->', foundFL[1])
        return foundFL[1]
      }
    }
    
    // Try last name only (more lenient)
    if (nameParts.length > 1) {
      const lastName = nameParts[nameParts.length - 1]
      if (lastName.length > 4) {
        const matches = Object.entries(tseMap).filter(([k]) => 
          k.includes(' ' + lastName) || k.includes(lastName + ' ')
        )
        if (matches.length > 0 && matches.length <= 3) {
          console.debug('[TSE Match] Last name:', nomeUrna, '->', matches[0][1])
          return matches[0][1]
        }
      }
    }
    
    console.debug('[TSE No Match]', nomeUrna)
    return undefined
  }

  _cache = [
    ...depRaw.map(raw => {
      const urna = raw.ultimoStatus?.nomeEleitoral ?? raw.ultimoStatus?.nome ?? raw.nomeCivil ?? raw.nome ?? ''
      const projetos = projetosMap[raw.id]
      const bancadas = bancadasMap[raw.id]
      const cotas = cotasMap[raw.id]
      const realExpenses = realExpensesMap[raw.id]
      const pixData = findPixByName(urna)
      const temasReais = temasReaisMap[raw.id]
      const presenca = presencaMap[raw.id]
      return normalizeDeputado(raw, lookupTse(urna), projetos, bancadas, cotas, realExpenses, pixData, temasReais, presenca, mandatosMap[raw.id], findProcessosByName(urna))
    }),
    ...senRaw.map(raw => {
      const ip = raw.IdentificacaoParlamentar ?? {}
      const urna = ip.NomeParlamentar ?? ip.NomeCompletoParlamentar ?? ''
      return normalizeSenador(raw, lookupTse(urna))
    }),
  ]
  
  // Debug: Find likely women by name
  const femaleNames = ['MARIA', 'ANA', 'JANDIRA', 'LÍDICE', 'ALICE', 'BENEDITA', 'ELCIONE', 'LUIZA', 'SORAIA', 'CLAUDIA', 'ROSÂNGELA', 'MÁRCIA', 'ALINE', 'ADRIANA', 'CRISTINA', 'TATIANA', 'VANESSA', 'PATRÍCIA', 'RAQUEL', 'DANIELA', 'MÔNICA', 'FLÁVIA', 'GILMA', 'IRACEMA', 'JUREMA', 'LÚCIA', 'NEUSA', 'REGINA', 'SANDRA', 'TEREZA', 'VÂNIA', 'ZILDA', 'APARECIDA', 'BERNADETE', 'CLEIDE', 'DELMA', 'EUNICE', 'HELENA', 'IVONE', 'JOANA', 'LENA', 'MARLENE', 'NILVA', 'ODETE', 'QUITÉRIA', 'ROSIMERE', 'TELMA', 'YOLANDA', 'ZULEICA', 'ALCIDES', 'ALMERINDA', 'AURORA', 'BERTA', 'CELESTE', 'DEBORA', 'ELENA', 'FÁTIMA', 'GERALDA', 'HELOÍSA', 'ISABEL', 'JOELINE', 'KÁTIA', 'LÚDERS', 'MAGDA', 'NADIR', 'OLÍMPIA', 'PAMELA', 'QUERUBINA', 'RUTE', 'SILENE', 'TALITA', 'URSULA', 'VIVIANE', 'WILMA', 'ZENI', 'ANGELA', 'BEATRIZ', 'CARLA', 'DORA', 'ESTER', 'FERNANDA', 'GLÓRIA', 'HILDA', 'ISABELA', 'JÚLIA', 'KARINA', 'LAURA', 'MARIANA', 'NATÁLIA', 'PATRÍCIA', 'RENATA', 'SARAH', 'TÂNIA', 'VERA', 'WANDA']
  
  const likelyWomen = _cache.filter(p => {
    const nameUpper = p.nome.toUpperCase()
    return femaleNames.some(n => nameUpper.includes(n)) && p.genero === 'Homem'
  }).slice(0, 20)
  
  console.debug('[Parliamentarians] Final data:', {
    total: _cache.length,
    byTipo: _cache.reduce((acc, p) => {
      acc[p.tipo] = (acc[p.tipo] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byGenero: _cache.reduce((acc, p) => {
      acc[p.genero] = (acc[p.genero] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byRaca: _cache.reduce((acc, p) => {
      acc[p.raca] = (acc[p.raca] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    likelyWomenWrong: likelyWomen.map(p => ({ id: p.id, nome: p.nome, genero: p.genero })),
    sample: _cache.slice(0, 10).map(p => ({
      id: p.id,
      nome: p.nome,
      nomeUrna: p.nomeUrna,
      partido: p.partido,
      uf: p.uf,
      tipo: p.tipo,
      genero: p.genero,
      raca: p.raca,
      alinhamento: p.alinhamento,
      patrimonio: p.patrimonio,
    }))
  })
  
  // Remove duplicates by ID - keep first occurrence
  const seen = new Set<string>()
  _cache = _cache.filter(p => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
  
  return _cache
}

export function getAllParliamentarians(): Parlamentar[] { return _cache ?? [] }
export async function warmCache(): Promise<void> { await getAllParliamentariansAsync() }

// ── MOCKS ─────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PROJETOS_NOMES = [
  { nome: 'PL 1234/2024 - Reforma Administrativa', desc: 'Reorganiza a estrutura administrativa do Executivo federal', url: 'https://www.camara.leg.br/propostas-legislativas/2416729' },
  { nome: 'PEC 45/2023 - Sistema Tributário', desc: 'Reforma do sistema tributário brasileiro com unificação de impostos', url: 'https://www.camara.leg.br/propostas-legislativas/2359769' },
  { nome: 'PL 2890/2024 - Marco Legal IA', desc: 'Estabelece princípios e regras para uso de inteligência artificial', url: 'https://www.camara.leg.br/propostas-legislativas/2372794' },
  { nome: 'PL 5678/2024 - Energia Renovável', desc: 'Incentivos para fontes renováveis de energia', url: 'https://www.camara.leg.br/propostas-legislativas/2387258' },
  { nome: 'PL 9012/2024 - Medicamentos Genéricos', desc: 'Amplia acesso a medicamentos genéricos', url: 'https://www.camara.leg.br/propostas-legislativas/2397251' },
  { nome: 'PEC 12/2024 - Reforma Previdência', desc: 'Altera regras de aposentadoria e pensões', url: 'https://www.camara.leg.br/propostas-legislativas/2401158' },
  { nome: 'PL 3456/2024 - Segurança Pública', desc: 'Novas medidas para combate ao crime organizado', url: 'https://www.camara.leg.br/propostas-legislativas/2379756' },
  { nome: 'PL 7890/2024 - Educação Básica', desc: 'Programa de financiamento da educação básica', url: 'https://www.camara.leg.br/propostas-legislativas/2390056' },
  { nome: 'PL 1357/2024 - Infraestrutura Digital', desc: 'Expansão da conectividade e infraestrutura de dados', url: 'https://www.camara.leg.br/propostas-legislativas/2354256' },
  { nome: 'PEC 89/2024 - Orçamento Impositivo', desc: 'Torna obrigatória a execução de emendas parlamentares', url: 'https://www.camara.leg.br/propostas-legislativas/2339406' },
  { nome: 'PL 2468/2024 - Agrotóxicos', desc: 'Regulamentação do uso de pesticidas na agricultura', url: 'https://www.camara.leg.br/propostas-legislativas/2368964' },
  { nome: 'PL 3579/2024 - Direitos Trabalhistas', desc: 'Alterações na CLT e direitos dos trabalhadores', url: 'https://www.camara.leg.br/propostas-legislativas/2374421' },
  { nome: 'PL 4680/2024 - Saúde Mental', desc: 'Política nacional de saúde mental e atenção psicossocial', url: 'https://www.camara.leg.br/propostas-legislativas/2381645' },
  { nome: 'PL 5791/2024 - Combate à Fome', desc: 'Programa de segurança alimentar e nutricional', url: 'https://www.camara.leg.br/propostas-legislativas/2388323' },
  { nome: 'PL 6802/2024 - Mudanças Climáticas', desc: 'Política nacional sobre mudança do clima', url: 'https://www.camara.leg.br/propostas-legislativas/2393428' },
  { nome: 'PEC 34/2024 - Autonomia BC', desc: 'Concede autonomia técnica e administrativa ao Banco Central', url: 'https://www.camara.leg.br/propostas-legislativas/2395656' },
  { nome: 'PL 7913/2024 - Proteção Dados', desc: 'Lei Geral de Proteção de Dados Pessoais', url: 'https://www.camara.leg.br/propostas-legislativas/2398189' },
  { nome: 'PL 8024/2024 - Reforma Agrária', desc: 'Programa de reforma agrária e distribuição de terras', url: 'https://www.camara.leg.br/propostas-legislativas/2400478' },
  { nome: 'PL 9135/2024 - Saneamento Básico', desc: 'Marco regulatório do saneamento básico', url: 'https://www.camara.leg.br/propostas-legislativas/2403456' },
  { nome: 'PL 1046/2024 - Telecomunicações', desc: 'Regulamentação do setor de telecomunicações', url: 'https://www.camara.leg.br/propostas-legislativas/2345678' },
]

export function mockVotes(seed: number) {
  const rng = mulberry32(seed)
  return Array.from({ length: 60 }, (_, i) => {
    const temaIdx = Math.floor(rng() * 8)
    const r = rng()
    const pos = r < 0.55 ? 'sim' : r < 0.8 ? 'nao' : r < 0.95 ? 'abs' : 'aus'
    const proj = PROJETOS_NOMES[Math.floor(rng() * PROJETOS_NOMES.length)]
    const dia = Math.floor(1 + rng() * 28)
    const mes = Math.floor(1 + rng() * 12)
    const ano = 2023 + Math.floor(rng() * 2)
    const data = `${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}`
    return { i, pos, h: Math.floor(30 + rng() * 130), temaIdx, tema: TEMAS[temaIdx], nome: proj.nome, desc: proj.desc, url: proj.url, data }
  })
}

export function mockBens(seed: number) {
  const rng = mulberry32(seed + 100)
  const base = 300 + rng() * 1000
  return [2010, 2014, 2018, 2022].map((ano, i) => ({
    ano,
    imoveis:    Math.round(base * (1 + i * 0.3 + rng() * 0.2)),
    veiculos:   Math.round(base * 0.12 * (1 + rng() * 0.5)),
    aplicacoes: Math.round(base * 0.22 * (1 + i * 0.15 + rng() * 0.3)),
    outros:     Math.round(base * 0.08 * (1 + rng() * 0.4)),
  }))
}

export function mockFinanciamento(seed: number) {
  const rng = mulberry32(seed + 200)
  const total = 800 + rng() * 3200
  return {
    total:   Math.round(total),
    pf:      Math.round(total * (0.1 + rng() * 0.25)),
    pj:      Math.round(total * (0.3 + rng() * 0.4)),
    partido: Math.round(total * (0.15 + rng() * 0.2)),
    proprio: Math.round(total * 0.05),
  }
}

// ── LAYOUT DO CONGRESSO ───────────────────────────────────────

export function congressLayout(W: number, H: number, maxCount?: number) {
  const positions: { x: number; y: number; region: string; color: string }[] = []
  // Usar 80% da menor dimensão da tela
  const scale = Math.max(0.6, Math.min(Math.min(W, H) / 450, 1.4))
  const CY = H * 0.5, CX = W * 0.5

  // Paleta multicolorida vibrante ultra-saturada — 36 cores variadas
  const PALETTE_FULL = [
    '#FF4D1C','#FF6B35','#FFE135','#FFD166','#FACC15','#E9FF70','#C8F752','#D4F5A0',
    '#86EFAC','#34D399','#22C55E','#10B981','#14B8A6','#06B6D4','#22D3EE','#38BDF8',
    '#60A5FA','#3B82F6','#0EA5E9','#6366F1','#818CF8','#A78BFA','#C77DFF','#A855F7',
    '#8B5CF6','#D946EF','#EC4899','#F472B6','#FF85C8','#FFC2B4','#FB923C','#F97316',
    '#EF4444','#DC2626','#B91C1C','#7FFFDA','#B8A9FF',
  ]
  const PALETTE_TORRE  = PALETTE_FULL
  const PALETTE_SENADO = PALETTE_FULL
  const PALETTE_CAMARA = PALETTE_FULL

  const CELL = 8 * scale, COLS = 4, ROWS = 24
  const TH = ROWS * CELL, tY0 = CY - TH / 2
  const gap = 18 * scale, tW = 2 * (COLS * CELL) + gap, tX0 = CX - tW / 2

  // Reduce pixels on mobile (small screens)
  const isMobile = W < 500
  const towerRows = isMobile ? Math.ceil(ROWS * 0.5) : ROWS
  const senNode = isMobile ? 14 * scale : 9 * scale
  const camNode = isMobile ? 11 * scale : 7 * scale

  let ti = 0
  for (let r = 0; r < towerRows; r++) for (let c = 0; c < COLS; c++) {
    const color = PALETTE_TORRE[(r * COLS + c) % PALETTE_TORRE.length]
    positions.push({ x: tX0 + c * CELL + CELL / 2, y: tY0 + r * CELL + CELL / 2, region: 'torre', color })
    ti++
  }
  for (let r = 0; r < towerRows; r++) for (let c = 0; c < COLS; c++) {
    const color = PALETTE_TORRE[(r * COLS + c + 3) % PALETTE_TORRE.length]
    positions.push({ x: tX0 + COLS * CELL + gap + c * CELL + CELL / 2, y: tY0 + r * CELL + CELL / 2, region: 'torre', color })
  }

  const senR = 85 * scale, senX = CX - 130 * scale
  let sn = 0
  for (let ri = senNode * 0.5; ri < senR * 0.95 && sn < 81; ri += senNode) {
    const n = Math.max(1, Math.round(Math.PI * ri / senNode))
    for (let k = 0; k < n && sn < 81; k++) {
      const a = -Math.PI + (k + (n % 2 === 0 ? 0.5 : 0)) * Math.PI / n
      const color = PALETTE_SENADO[sn % PALETTE_SENADO.length]
      positions.push({ x: senX + ri * Math.cos(a), y: CY - ri * Math.abs(Math.sin(a)) * 0.65, region: 'senado', color })
      sn++
    }
  }

  const camR = 105 * scale, camX = CX + 130 * scale
  let cn = 0
  const maxCam = isMobile ? 200 : 513
  for (let ri = camNode * 0.5; ri < camR * 0.95 && cn < maxCam; ri += camNode) {
    const n = Math.max(1, Math.round(Math.PI * ri / camNode))
    for (let k = 0; k < n && cn < maxCam; k++) {
      const a = (k + (n % 2 === 0 ? 0.5 : 0)) * Math.PI / n
      const color = PALETTE_CAMARA[cn % PALETTE_CAMARA.length]
      positions.push({ x: camX + ri * Math.cos(a), y: CY + ri * Math.abs(Math.sin(a)) * 0.65, region: 'camara', color })
      cn++
    }
  }

  return maxCount ? positions.slice(0, maxCount) : positions.slice(0, 594)
}

// Layout apenas com as cúpulas (sem torres) — usado no modo "Casa"
// Escala maior para usar mais espaço da tela
export function domesLayout(W: number, H: number) {
  const positions: { x: number; y: number; region: string; color: string }[] = []
  const scale = Math.max(0.5, Math.min(Math.min(W, H) / 480, 1.6))
  const CY = H * 0.52, CX = W * 0.5

  const PALETTE = ['#38BDF8','#818CF8','#34D399','#F472B6','#FACC15','#FB923C','#A78BFA','#60A5FA','#E879F9','#22D3EE','#FCD34D','#86EFAC']

  // Senado — cúpula SUPERIOR (abre para cima), lado esquerdo
  // Raio maior para acomodar 81 senadores com espaço
  const senR = 160 * scale, senX = CX - 180 * scale, senNode = 10 * scale
  let sn = 0
  for (let ri = senNode * 0.5; ri < senR * 0.97 && sn < 81; ri += senNode) {
    const n = Math.max(1, Math.round(Math.PI * ri / senNode))
    for (let k = 0; k < n && sn < 81; k++) {
      const a = -Math.PI + (k + (n % 2 === 0 ? 0.5 : 0)) * Math.PI / n
      const color = PALETTE[sn % PALETTE.length]
      positions.push({
        x: senX + ri * Math.cos(a),
        y: CY - ri * Math.abs(Math.sin(a)) * 0.72,
        region: 'senado', color
      })
      sn++
    }
  }

  // Câmara — cúpula INFERIOR (abre para baixo), lado direito
  // Raio maior para 513 deputados
  const camR = 200 * scale, camX = CX + 180 * scale, camNode = 8 * scale
  let cn = 0
  for (let ri = camNode * 0.5; ri < camR * 0.97 && cn < 513; ri += camNode) {
    const n = Math.max(1, Math.round(Math.PI * ri / camNode))
    for (let k = 0; k < n && cn < 513; k++) {
      const a = (k + (n % 2 === 0 ? 0.5 : 0)) * Math.PI / n
      const color = PALETTE[cn % PALETTE.length]
      positions.push({
        x: camX + ri * Math.cos(a),
        y: CY + ri * Math.abs(Math.sin(a)) * 0.72,
        region: 'camara', color
      })
      cn++
    }
  }

  return positions.slice(0, 594)
}
