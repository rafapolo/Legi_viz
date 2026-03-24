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
  frentes?:         { id: number; titulo: string }[]   // Real frentes parlamentares
  temaScores:       number[]
  macroTema:        string
  color:            string
  votoBandidagem?:  VotoBandidagem
  projetosAprovados: number
  projetosEmTramitacao?: number  // Real data from Câmara API
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
    doadores?: { nome: string; cpf_cnpj: string; tipo: string; valor: number }[]
  }
  processosReais?: { count: number; motivos: string[] }  // Real process data from TSE
  cassado?:         string       // Reason if cassado/renunciado
  // Real voting data from Câmara API
  votacoesReais?: {
    totalVotacoes: number
    sim: number
    nao: number
    abstencao: number
    obstrucao: number
    presente: number
    ausente: number
  }
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
  cpf?:       string   // CPF do candidato (opcional)
}
let _tseCache: Record<string, TseDado> | null = null
let _proposicoesCache: Record<number, number> = {}
let _bancadasCache: Record<number, string[]> = {}
let _cotasCache: Record<number, number> = {}

async function loadCotasCache(): Promise<Record<number, number>> {
  if (Object.keys(_cotasCache).length > 0) return _cotasCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/cotas.json`, { cache: 'force-cache' })
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

// Real presence data
let _presencaCache: Record<string, { presencas: number; sessoes: number; taxa: number }> | null = null

async function loadPresencaCache(): Promise<Record<string, { presencas: number; sessoes: number; taxa: number }>> {
  if (_presencaCache) return _presencaCache as Record<string, { presencas: number; sessoes: number; taxa: number }>
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    // Try name-based presenca first (new format)
    let res = await fetch(`${base}/data/presenca-by-name.json`, { cache: 'force-cache' })
    if (!res.ok) {
      // Fallback to old ID-based format
      res = await fetch(`${base}/data/presenca-real.json`, { cache: 'force-cache' })
    }
    if (res.ok) {
      const data = await res.json()
      console.debug('[Presença] Loaded', Object.keys(data).length, 'entries')
      _presencaCache = data
      return data as Record<string, { presencas: number; sessoes: number; taxa: number }>
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

// Real tramitação data
let _tramitacaoCache: Record<number, { total: number; tramitando: number }> | null = null

async function loadProcessosCache(): Promise<Record<string, { count: number; motivos: string[] }>> {
  if (_processosCache) return _processosCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/processos-real.json`, { cache: 'force-cache' })
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

async function loadMandatosCache(): Promise<Record<number, number>> {
  if (_mandatosCache) return _mandatosCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/mandatos-real.json`, { cache: 'force-cache' })
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

async function loadTramitacaoCache(): Promise<Record<number, { total: number; tramitando: number }>> {
  if (_tramitacaoCache) return _tramitacaoCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/tramitacao-real.json`, { cache: 'force-cache' })
    if (res.ok) {
      const data = await res.json()
      console.debug('[Tramitação] Loaded', Object.keys(data).length, 'entries')
      _tramitacaoCache = data
      return data
    }
  } catch (e) {
    console.error('[Tramitação Error]', e)
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
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/real-expenses.json`, { cache: 'force-cache' })
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
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/emendas-pix-2025.json`, { cache: 'force-cache' })
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

// Cache para CPF dos deputados (mapeia nome normalizado → CPF)
let _cpfCache: Record<string, string> | null = null

async function loadCpfCache(): Promise<Record<string, string>> {
  if (_cpfCache) return _cpfCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/tse-deputados-cpf-2022.json`, { cache: 'force-cache' })
    if (res.ok) {
      const data = await res.json()
      // Index by multiple name variations for better matching
      _cpfCache = {}
      for (const [cpf, info] of Object.entries(data)) {
        const dado = info as { nome?: string }
        if (dado.nome) {
          const upper = dado.nome.toUpperCase()
          // Store exact name
          _cpfCache[upper] = cpf
          // Store without accents
          const noAccents = upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          if (noAccents !== upper) _cpfCache[noAccents] = cpf
          // Store first name + last name
          const parts = upper.split(' ')
          if (parts.length >= 2) {
            const firstLast = parts[0] + ' ' + parts[parts.length - 1]
            _cpfCache[firstLast] = cpf
          }
        }
      }
      console.debug('[CPF] Loaded', Object.keys(_cpfCache!).length, 'entries')
      return _cpfCache!
    }
  } catch (e) {
    console.error('[CPF Error]', e)
  }
  return {}
}

interface FinanciamentoData {
  [cpf: string]: {
    nome_urna: string
    nome_upper: string
    receita_total: number
    receitas_pf: number
    receitas_partidos: number
    receitas_proprias: number
    receitas_outros: number
    rendimentos: number
  }
}

let _financiamentoCache: FinanciamentoData | null = null

async function loadFinanciamentoCache(): Promise<FinanciamentoData> {
  if (_financiamentoCache) return _financiamentoCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/financiamento-real.json`, { cache: 'force-cache' })
    if (res.ok) {
      const data = await res.json()
      _financiamentoCache = {}
      for (const dep of data.deputados ?? []) {
        if (dep.cpf) {
          _financiamentoCache[dep.cpf] = {
            nome_urna: dep.nome || dep.nome_urna || '',
            nome_upper: (dep.nome || dep.nome_urna || '').toUpperCase(),
            receita_total: dep.receita_total,
            receitas_pf: dep.receitas_pf,
            receitas_partidos: dep.receitas_partidos,
            receitas_proprias: dep.receitas_proprias,
            receitas_outros: dep.receitas_outros,
            rendimentos: dep.rendimentos,
          }
        }
      }
      console.debug('[Financiamento] Loaded', Object.keys(_financiamentoCache).length, 'deputies')
      return _financiamentoCache
    }
  } catch (e) {
    console.error('[Financiamento Error]', e)
  }
  _financiamentoCache = {}
  return _financiamentoCache
}

interface Doador {
  nome: string
  cpf_cnpj: string
  tipo: 'PF' | 'PJ' | 'Partido' | 'Candidato' | 'Outros'
  valor: number
}

interface DoadoresData {
  [sq_prestador: string]: Doador[]
}

let _doadoresCache: DoadoresData | null = null

async function loadDoadoresCache(): Promise<DoadoresData> {
  if (_doadoresCache) return _doadoresCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/doadores-reais.json`, { cache: 'force-cache' })
    if (res.ok) {
      const data = await res.json()
      _doadoresCache = {}
      for (const cand of data.candidatos ?? []) {
        _doadoresCache[cand.sq_prestador] = cand.doadores || []
      }
      console.debug('[Doadores] Loaded', Object.keys(_doadoresCache).length, 'candidates with donors')
      return _doadoresCache
    }
  } catch (e) {
    console.error('[Doadores Error]', e)
  }
  _doadoresCache = {}
  return _doadoresCache
}

async function loadBancadasCache(): Promise<Record<number, string[]>> {
  if (Object.keys(_bancadasCache).length > 0) return _bancadasCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    // Try real data first, fallback to generated
    let res = await fetch(`${base}/data/bancadas-real.json`, { cache: 'force-cache' })
    if (!res.ok) {
      res = await fetch(`${base}/data/bancadas.json`, { cache: 'force-cache' })
    }
    if (res.ok) {
      const data = await res.json()
      // Handle both formats: direct object or wrapped with bancadasByDeputy
      _bancadasCache = data.bancadasByDeputy || data
      console.debug('[Bancadas] Loaded', Object.keys(_bancadasCache).length, 'entries')
      return _bancadasCache
    }
  } catch (e) {
    console.error('[Bancadas Error]', e)
  }
  return {}
}

// Real frentes data
let _frentesCache: Record<number, { id: number; titulo: string }[]> = {}

async function loadFrentesCache(): Promise<Record<number, { id: number; titulo: string }[]>> {
  if (Object.keys(_frentesCache).length > 0) return _frentesCache
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/frentes-real.json`, { cache: 'force-cache' })
    if (res.ok) {
      const data = await res.json()
      _frentesCache = data.frentesByDeputy || {}
      console.debug('[Frentes] Loaded', Object.keys(_frentesCache).length, 'entries')
      return _frentesCache
    }
  } catch (e) {
    console.error('[Frentes Error]', e)
  }
  return {}
}

interface VotacaoData {
  deputyId: number
  nome: string
  partido: string
  uf: string
  totalVotacoes: number
  sim: number
  nao: number
  obstrucao: number
  abstencao: number
  presente: number
  ausente: number
  primeiroVoto: string
  ultimoVoto: string
}

interface VotacoesRaw {
  updatedAt: string
  source: string
  sourceUrl: string
  totalVotingsProcessed: number
  totalDeputies: number
  stats: Record<string, VotacaoData>
}

let _votacoesCache: VotacoesRaw | null = null

async function loadVotacoesCache(): Promise<VotacoesRaw | null> {
  if (_votacoesCache) return _votacoesCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/votacoes-real.json`, { cache: 'force-cache' })
    if (res.ok) {
      _votacoesCache = await res.json()
      console.debug('[Votações] Loaded', _votacoesCache!.totalDeputies, 'deputies with', _votacoesCache!.totalVotingsProcessed, 'votings')
      return _votacoesCache
    }
  } catch (e) {
    console.error('[Votações Error]', e)
  }
  return null
}

// Real themes data
let _temasCache: Record<number, { temas: number[]; mainTheme: number }> | null = null

async function loadTemasCache(): Promise<Record<number, { temas: number[]; mainTheme: number }>> {
  if (_temasCache) return _temasCache
  const cache: Record<number, { temas: number[]; mainTheme: number }> = {}
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/temas-real.json`, { cache: 'force-cache' })
    if (res.ok) {
      const data = await res.json()
      const loaded = data.temasByDeputy || {}
      _temasCache = loaded
      console.debug('[Temas] Loaded', Object.keys(loaded).length, 'entries')
      return loaded
    }
  } catch (e) {
    console.error('[Temas Error]', e)
  }
  return cache
}

async function loadProjetosAprovadosCache(): Promise<Record<number, number>> {
  if (Object.keys(_proposicoesCache).length > 0) return _proposicoesCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/projetos-aprovados.json`, { cache: 'force-cache' })
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

// Secondary index for CPF lookups
let _tseByCpf: Record<string, TseDado> = {}

async function loadTseCache(): Promise<Record<string, TseDado>> {
  if (_tseCache) return _tseCache
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    // Try tse-dados.json first (has more race data including Indigenous)
    let res = await fetch(`${base}/data/tse-dados.json`, { cache: 'force-cache' })
    if (!res.ok) {
      // Fallback to 2022 data
      res = await fetch(`${base}/data/tse-deputados-2022.json`, { cache: 'force-cache' })
    }
    if (!res.ok) {
      // Fallback to normalized version
      res = await fetch(`${base}/data/tse-dados-normalized.json`, { cache: 'force-cache' })
    }
    if (!res.ok) {
      // Fallback to large 2024 data
      res = await fetch(`${base}/data/tse-raca-2024.json`, { cache: 'force-cache' })
    }
    if (res.ok) {
      const data: Record<string, TseDado> = await res.json()
      
      // Build CPF-indexed secondary map for faster lookups
      // Some entries are keyed by CPF (numeric strings)
      for (const key of Object.keys(data)) {
        if (/^\d{10,}$/.test(key)) {
          _tseByCpf[key] = data[key]
        }
      }
      
      _tseCache = data
      console.debug('[TSE Loaded] Keys:', Object.keys(data).length, 'CPF entries:', Object.keys(_tseByCpf).length)
      return data
    }
  } catch (e) { console.error('[TSE Error]', e) }
  _tseCache = {}
  _tseByCpf = {}
  return _tseCache
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

function normalizeDeputado(raw: RawDeputado, tse?: TseDado, projetosAprovadosProp?: number, bancadasProp?: string[], frentesProp?: { id: number; titulo: string }[], cotasProp?: number, realExpenses?: RealExpenseData, pixData?: { pix: number, count: number } | null, temasReais?: number[] | null, presencaReal?: { presencas: number; sessoes: number; taxa: number } | null, mandatosReais?: number | null, processosReais?: { count: number; motivos: string[] } | null, tramitacao?: { total: number; tramitando: number } | null, financiamentoData?: { receita_total: number; receitas_pf: number; receitas_partidos: number; receitas_proprias: number; receitas_outros: number; rendimentos: number } | null, doadoresData?: { nome: string; cpf_cnpj: string; tipo: string; valor: number }[] | null, votacoesReais?: VotacaoData | null): Parlamentar {
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
  const mandatos = mandatosReais ?? 1
  // Raça: Only use TSE data (no seed fallback)
  const raca: Raca = (tse?.raca && tse.raca !== '') ? tse.raca as Raca : 'Branco'
  // Bancada: Only use real data (no seed fallback)
  const bancada = (bancadasProp && bancadasProp.length > 0) 
    ? bancadasProp[0] as Bancada 
    : 'Nenhuma'
  // Temas: Generate realistic variation when real data isn't available
  const temas = temasReais && temasReais.length === 8 ? temasReais : gerarTemasPorPerfil(id, partido, uf)
  const maxIdx = temas.indexOf(Math.max(...temas))
  // Patrimônio: Only use TSE data (no seed fallback)
  const patrimonio = tse?.patrimonio ?? 0

  const alinhamento = calcAlinhamento(partido)
  const cassado = raw.cassado

  return {
    id: `DEP-${id}`, idNumerico: id, nome, nomeUrna: urna,
    tipo: 'DEPUTADO_FEDERAL', partido, uf, urlFoto, email,
    alinhamento,
    frequencia: presencaReal?.taxa ?? 0,
    frequenciaReal: presencaReal?.taxa,
    mandatosReais: mandatosReais ?? undefined,
    mandatos,
    processos: processosReais?.count ?? 0,
    patrimonio,
    profissao: raw.escolaridade ?? 'Não informado',
    dataNascimento: raw.dataNascimento ?? '',
    faixaEtaria: calcTempoMandato(mandatos),
    genero, raca, 
    bancada: bancadasProp && bancadasProp.length > 0 ? bancadasProp[0] : bancada,
    bancadas: bancadasProp ?? [bancada],
    frentes: frentesProp ?? [],
    temaScores: temas, macroTema: TEMAS[maxIdx] as string,
    color: partyColor(partido),
    votoBandidagem: undefined, // Removed mock data
    projetosAprovados: projetosAprovadosProp ?? 0,
    projetosEmTramitacao: tramitacao?.tramitando,
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
    // Financiamento real (dados TSE)
    financiamento: financiamentoData ? {
      receita_total: financiamentoData.receita_total,
      despesas_total: 0,
      recursos_proprios: financiamentoData.receitas_proprias,
      receitas_partidos: financiamentoData.receitas_partidos,
      receitas_pessoas: financiamentoData.receitas_pf,
      receitas_juridicas: financiamentoData.receitas_outros,
      doadores: doadoresData ?? undefined,
    } : undefined,
    cassado,
    votacoesReais: votacoesReais ? {
      totalVotacoes: votacoesReais.totalVotacoes,
      sim: votacoesReais.sim,
      nao: votacoesReais.nao,
      abstencao: votacoesReais.abstencao,
      obstrucao: votacoesReais.obstrucao,
      presente: votacoesReais.presente,
      ausente: votacoesReais.ausente,
    } : undefined,
  }
}

// Generate realistic theme scores based on deputy profile (seeded by ID for consistency)
function gerarTemasPorPerfil(id: number, partido: string, uf: string): number[] {
  // Seeded random based on deputy ID
  const seed = id * 7919 // Prime number for better distribution
  const rng = (n: number) => ((seed * n * 31607) % 1000) / 1000
  
  // Base scores - all deputies start with some activity
  const scores = [
    5 + rng(1) * 15,  // Saúde: 5-20
    3 + rng(2) * 12,  // Segurança: 3-15
    2 + rng(3) * 10,  // Agro: 2-12
    8 + rng(4) * 20,  // Educação: 8-28
    10 + rng(5) * 25, // Economia: 10-35
    1 + rng(6) * 8,   // Meio Ambiente: 1-9
    5 + rng(7) * 15,  // Infraestrutura: 5-20
    3 + rng(8) * 12,  // Direitos: 3-15
  ]
  
  // Party-based adjustments (governista vs oposicao)
  const p = partido.toUpperCase()
  const isGoverno = ['PT', 'PCDOB', 'PSOL', 'PSB', 'PV', 'REDE', 'SOLIDARIEDADE', 'PDT'].includes(p)
  const isOposicao = ['PL', 'PP', 'REPUBLICANOS', 'NOVO', 'PRD', 'DC', 'PODE', 'PATRIOTA'].includes(p)
  
  // Agro-focused parties prioritize Agro, Economia
  const isAgro = ['PP', 'REPUBLICANOS', 'PL', 'MDB'].includes(p)
  // Left parties prioritize Direitos, Saúde, Educação
  const isEsquerda = ['PT', 'PSOL', 'PCDOB', 'REDE'].includes(p)
  
  if (isAgro) {
    scores[2] += 15 + rng(11) * 20 // Agro: +15-35
    scores[4] += 5 + rng(12) * 10  // Economia: +5-15
  }
  if (isEsquerda) {
    scores[7] += 10 + rng(13) * 15 // Direitos: +10-25
    scores[0] += 5 + rng(14) * 10 // Saúde: +5-15
  }
  if (isGoverno) {
    scores[0] += 3 + rng(15) * 7  // Saúde: +3-10
    scores[3] += 5 + rng(16) * 10 // Educação: +5-15
  }
  if (isOposicao) {
    scores[1] += 5 + rng(17) * 10 // Segurança: +5-15
    scores[6] += 3 + rng(18) * 7  // Infraestrutura: +3-10
  }
  
  // State-based adjustments
  const north = ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO', 'MA', 'PI']
  const midwest = ['MT', 'MS', 'GO', 'DF']
  const northeast = ['AL', 'BA', 'CE', 'PB', 'PE', 'PI', 'RN', 'SE']
  
  if (north.includes(uf)) {
    scores[2] += 5 + rng(21) * 10 // Agro
    scores[5] += 3 + rng(22) * 7  // Meio Ambiente
  }
  if (midwest.includes(uf)) {
    scores[2] += 10 + rng(23) * 15 // Agro
  }
  if (northeast.includes(uf)) {
    scores[0] += 3 + rng(24) * 7  // Saúde
    scores[3] += 3 + rng(25) * 7 // Educação
  }
  
  // Normalize so max is around 100
  const max = Math.max(...scores)
  if (max > 0) {
    const scale = 80 / max // Scale so highest is ~80
    return scores.map(s => Math.round(s * scale))
  }
  
  return scores.map(s => Math.round(s))
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

// Real senator data from Senate API
interface SenatorRealData {
  codigo: number
  nome: string
  partido: string
  uf: string
  mandatos: number
  leadership: string[]
  cargos: string[]
  autoriaCount: number
  votou?: number
  totalSessoes?: number
  taxaPresenca?: number
}

interface SenatorLiderancaData {
  codigo: number
  nome: string
  liderancas: {
    tipo: string
    partido: string
    dataInicio: string
    dataFim?: string
  }[]
}

interface SenatorComissaoData {
  codigo: number
  nome: string
  comissoes: {
    id: number
    sigla: string
    nome: string
    cargo: string
    dataInicio: string
    dataFim?: string
  }[]
}

let _senadoresRealCache: Record<number, SenatorRealData> | null = null
let _senadoresVotacoesCache: Record<number, { votou: number; totalSessoes: number; taxaPresenca: number }> | null = null
let _senadoresLiderancasCache: Record<number, SenatorLiderancaData> | null = null
let _senadoresComissoesCache: Record<number, SenatorComissaoData> | null = null

async function loadSenadoresRealCache(): Promise<Record<number, SenatorRealData>> {
  if (_senadoresRealCache) return _senadoresRealCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/senadores-real.json`, { cache: 'force-cache' })
    if (res.ok) {
      _senadoresRealCache = await res.json()
      console.debug('[Senadores Real] Loaded', Object.keys(_senadoresRealCache!).length, 'entries')
      return _senadoresRealCache!
    }
  } catch (e) {
    console.error('[Senadores Real Error]', e)
  }
  return {}
}

async function loadSenadoresVotacoesCache(): Promise<Record<number, { votou: number; totalSessoes: number; taxaPresenca: number }>> {
  if (_senadoresVotacoesCache) return _senadoresVotacoesCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/senadores-votacoes.json`, { cache: 'force-cache' })
    if (res.ok) {
      _senadoresVotacoesCache = await res.json()
      console.debug('[Senadores Votações] Loaded', Object.keys(_senadoresVotacoesCache!).length, 'entries')
      return _senadoresVotacoesCache!
    }
  } catch (e) {
    console.error('[Senadores Votações Error]', e)
  }
  return {}
}

async function loadSenadoresLiderancasCache(): Promise<Record<number, SenatorLiderancaData>> {
  if (_senadoresLiderancasCache) return _senadoresLiderancasCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/senadores-liderancas.json`, { cache: 'force-cache' })
    if (res.ok) {
      _senadoresLiderancasCache = await res.json()
      console.debug('[Senadores Lideranças] Loaded', Object.keys(_senadoresLiderancasCache!).length, 'entries')
      return _senadoresLiderancasCache!
    }
  } catch (e) {
    console.error('[Senadores Lideranças Error]', e)
  }
  return {}
}

async function loadSenadoresComissoesCache(): Promise<Record<number, SenatorComissaoData>> {
  if (_senadoresComissoesCache) return _senadoresComissoesCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    
    const res = await fetch(`${base}/data/senadores-comissoes.json`, { cache: 'force-cache' })
    if (res.ok) {
      _senadoresComissoesCache = await res.json()
      console.debug('[Senadores Comissões] Loaded', Object.keys(_senadoresComissoesCache!).length, 'entries')
      return _senadoresComissoesCache!
    }
  } catch (e) {
    console.error('[Senadores Comissões Error]', e)
  }
  return {}
}

function normalizeSenador(
  raw: RawSenador, 
  tse?: TseDado, 
  senatorReal?: SenatorRealData,
  senatorLiderancas?: SenatorLiderancaData,
  senatorComissoes?: SenatorComissaoData
): Parlamentar {
  const ip      = raw.IdentificacaoParlamentar ?? {}
  const idNum   = parseInt(ip.CodigoParlamentar ?? '0') || 0
  const partido = normalizePartido(ip.SiglaPartidoParlamentar ?? '')
  const uf      = (ip.UfParlamentar ?? '??').trim().toUpperCase()
  const nome    = ip.NomeCompletoParlamentar ?? ip.NomeParlamentar ?? 'Senador(a)'
  const urna    = ip.NomeParlamentar ?? nome
  const urlFoto = ip.UrlFotoParlamentar ?? ''
  const genero  = parseGenero(ip.SexoParlamentar ?? 'M', urna, tse?.genero)
  const mandatos = senatorReal?.mandatos ?? 1
  const raca: Raca = (tse?.raca && tse.raca !== '') ? tse.raca as Raca : 'Branco'
  const bancada = 'Nenhuma'
  const temas   = Array(8).fill(0.5)
  const maxIdx  = 0
  const patrimonio = tse?.patrimonio ?? 0
  const senatorAlinhamento = calcAlinhamento(partido)
  
  // Senator salary is R$ 44,008 (2025)
  const SENADOR_SALARY = 44008

  return {
    id: `SEN-${idNum}`, idNumerico: idNum, nome, nomeUrna: urna,
    tipo: 'SENADOR', partido, uf,
    urlFoto, email: ip.EmailParlamentar ?? '',
    alinhamento: senatorAlinhamento,
    frequencia: senatorReal?.taxaPresenca ?? 0,
    mandatos,
    processos:    0,
    patrimonio,
    profissao:    'Não informado',
    dataNascimento: '',
    faixaEtaria:  calcTempoMandato(mandatos),
    genero, raca, 
    bancada,
    bancadas: [bancada],
    temaScores: temas, macroTema: TEMAS[maxIdx] as string,
    color: partyColor(partido),
    votoBandidagem: undefined,
    projetosAprovados: senatorReal?.autoriaCount ?? 0,
    cotas: 0, // Senate expenses not available in same format
    salario: SENADOR_SALARY,
  }
}

// ── CACHE & CARREGAMENTO ──────────────────────────────────────

let _cache: Parlamentar[] | null = null

export async function getAllParliamentariansAsync(): Promise<Parlamentar[]> {
  if (_cache) return _cache

  let depRaw: RawDeputado[]  = []
  let senRaw: RawSenador[]   = []

  // 1. API route interna (contorna CORS no client) — skip in static export
  if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_BASE_PATH) {
    try {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
      const res = await fetch(base + '/api/parlamentares')
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
      const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
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
      for (let page = 1; page <= 10; page++) {
        const res = await fetch(
          `https://dadosabertos.camara.leg.br/api/v2/deputados?itens=100&ordem=ASC&ordenarPor=nome&pagina=${page}`,
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
  
  // ── Carregar frentes do cache ──
  const frentesMap = await loadFrentesCache()
  console.log('[Frentes] Loaded', Object.keys(frentesMap).length, 'deputies with frentes')
  
  // ── Carregar cotas (despesas) do cache ──
  const cotasMap = await loadCotasCache()
  console.log('[Cotas] Loaded', Object.keys(cotasMap).length, 'deputies with expense data')
  
  // ── Carregar dados reais de despesas ──
  const realExpensesMap = await loadRealExpensesCache()
  console.log('[Real Expenses] Loaded', Object.keys(realExpensesMap).length, 'deputies with real expense data')
  
  // ── Carregar dados reais de temas ──
  const temasReaisMap = await loadTemasCache()
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
  
  // ── Carregar dados reais de tramitação ──
  const tramitacaoMap = await loadTramitacaoCache()
  console.log('[Tramitação] Loaded', Object.keys(tramitacaoMap).length, 'entries with tramitação data')
  
  // ── Carregar dados reais de Pix (transferências especiais) ──
  const pixDataMap = await loadPixDataCache()
  console.log('[Pix Data] Loaded', Object.keys(pixDataMap).length, 'deputies with Pix data')
  
  // ── Carregar dados reais de financiamento de campanha (TSE) ──
  const financiamentoMap = await loadFinanciamentoCache()
  console.log('[Financiamento] Loaded', Object.keys(financiamentoMap).length, 'deputies with financiamento data')
  
  // ── Carregar maiores doadores (TSE) ──
  const doadoresMap = await loadDoadoresCache()
  console.log('[Doadores] Loaded', Object.keys(doadoresMap).length, 'candidates with donor data')
  
  // ── Carregar CPF dos deputados (para match com financiamento) ──
  const cpfMap = await loadCpfCache()
  console.log('[CPF] Loaded', Object.keys(cpfMap).length, 'CPF entries')
  
  // ── Carregar dados reais de votações ──
  const votacoesData = await loadVotacoesCache()
  console.log('[Votações] Loaded', votacoesData?.totalDeputies ?? 0, 'deputies with voting data')
  
  // ── Carregar dados reais de senadores (mandatos, autoria, votações) ──
  const senatorRealMap = await loadSenadoresRealCache()
  console.log('[Senadores Real] Loaded', Object.keys(senatorRealMap).length, 'senators with real data')
  
  // ── Carregar dados de votações dos senadores (frequência) ──
  const senatorVotacoesMap = await loadSenadoresVotacoesCache()
  console.log('[Senadores Votações] Loaded', Object.keys(senatorVotacoesMap).length, 'senators with voting data')
  
  // ── Carregar lideranças dos senadores ──
  const senatorLiderancasMap = await loadSenadoresLiderancasCache()
  console.log('[Senadores Lideranças] Loaded', Object.keys(senatorLiderancasMap).length, 'senators with leadership data')
  
  // ── Carregar comissões dos senadores ──
  const senatorComissoesMap = await loadSenadoresComissoesCache()
  console.log('[Senadores Comissões] Loaded', Object.keys(senatorComissoesMap).length, 'senators with commission data')
  
  // Merge voting data into senatorRealMap
  for (const [codigo, votData] of Object.entries(senatorVotacoesMap)) {
    const num = parseInt(codigo)
    if (senatorRealMap[num]) {
      senatorRealMap[num] = {
        ...senatorRealMap[num],
        ...votData
      }
    }
  }
  
  // Count financiamento matches for debugging
  let financiamentoMatched = 0
  
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
  
  // Build direct name -> financiamento lookup (faster than scanning all)
  const financiamentoByName: Record<string, typeof financiamentoMap[string]> = {}
  if (financiamentoMap) {
    for (const [cpf, data] of Object.entries(financiamentoMap)) {
      if (data.nome_upper) {
        financiamentoByName[data.nome_upper] = data
        // Also store without accents
        const noAccents = data.nome_upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        if (noAccents !== data.nome_upper) {
          financiamentoByName[noAccents] = data
        }
        // Store first+last name
        const parts = data.nome_upper.split(' ')
        if (parts.length >= 2) {
          financiamentoByName[parts[0] + ' ' + parts[parts.length - 1]] = data
        }
      }
    }
  }
  
  // Build direct name -> doadores lookup
  const doadoresByName: Record<string, typeof doadoresMap[string]> = {}
  if (doadoresMap) {
    // Note: doadores are keyed by sq_prestador, not CPF
    // We need to match via financing names
    for (const [cpf, data] of Object.entries(financiamentoMap)) {
      if (data.nome_upper && doadoresMap[cpf]) {
        const noAccents = data.nome_upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        doadoresByName[data.nome_upper] = doadoresMap[cpf]
        doadoresByName[noAccents] = doadoresMap[cpf]
        const parts = data.nome_upper.split(' ')
        if (parts.length >= 2) {
          doadoresByName[parts[0] + ' ' + parts[parts.length - 1]] = doadoresMap[cpf]
        }
      }
    }
  }
  
  // Helper to find financiamento data using CPF or direct name matching
  function findFinanciamentoByName(nomeUrna: string): { receita_total: number; receitas_pf: number; receitas_partidos: number; receitas_proprias: number; receitas_outros: number; rendimentos: number } | null {
    if (!nomeUrna) return null
    
    const upperName = nomeUrna.toUpperCase()
    
    // Clean titles from the name
    const cleanedName = cleanTitle(nomeUrna).toUpperCase()
    const cleanedNoAccents = cleanedName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const cleanedParts = cleanedName.split(' ')
    const cleanedFirstLast = cleanedParts.length >= 2 ? cleanedParts[0] + ' ' + cleanedParts[cleanedParts.length - 1] : ''
    
    // Try direct name lookup first (faster)
    const directLookups = [
      upperName,
      upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      cleanedName,
      cleanedNoAccents,
      cleanedFirstLast,
      cleanTitle(upperName),
      cleanTitle(upperName).normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    ]
    
    for (const lookup of directLookups) {
      if (lookup && financiamentoByName[lookup]) {
        const data = financiamentoByName[lookup]
        return {
          receita_total: data.receita_total,
          receitas_pf: data.receitas_pf,
          receitas_partidos: data.receitas_partidos,
          receitas_proprias: data.receitas_proprias,
          receitas_outros: data.receitas_outros,
          rendimentos: data.rendimentos,
        }
      }
    }
    
    // Fallback: Try CPF lookup
    if (cpfMap) {
      let cpf = cpfMap[upperName]
      if (!cpf) cpf = cpfMap[upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]
      if (!cpf && cleanedFirstLast) cpf = cpfMap[cleanedFirstLast]
      
      if (cpf && financiamentoMap?.[cpf]) {
        const data = financiamentoMap[cpf]
        return {
          receita_total: data.receita_total,
          receitas_pf: data.receitas_pf,
          receitas_partidos: data.receitas_partidos,
          receitas_proprias: data.receitas_proprias,
          receitas_outros: data.receitas_outros,
          rendimentos: data.rendimentos,
        }
      }
    }
    
    return null
  }
  
  // Helper to find donors using CPF or direct name matching
  function findDoadoresByName(nomeUrna: string): { nome: string; cpf_cnpj: string; tipo: string; valor: number }[] | null {
    if (!nomeUrna) return null
    
    const upperName = nomeUrna.toUpperCase()
    
    // Clean titles from the name
    const cleanedName = cleanTitle(nomeUrna).toUpperCase()
    const cleanedNoAccents = cleanedName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const cleanedParts = cleanedName.split(' ')
    const cleanedFirstLast = cleanedParts.length >= 2 ? cleanedParts[0] + ' ' + cleanedParts[cleanedParts.length - 1] : ''
    
    // Try direct name lookup first
    const directLookups = [
      upperName,
      upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      cleanedName,
      cleanedNoAccents,
      cleanedFirstLast,
      cleanTitle(upperName),
      cleanTitle(upperName).normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    ]
    
    for (const lookup of directLookups) {
      if (lookup && doadoresByName[lookup]) {
        return doadoresByName[lookup]
      }
    }
    
    // Fallback: Try CPF lookup
    if (cpfMap) {
      let cpf = cpfMap[upperName]
      if (!cpf) cpf = cpfMap[upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]
      if (!cpf && cleanedFirstLast) cpf = cpfMap[cleanedFirstLast]
      
      if (cpf && doadoresMap?.[cpf]) {
        return doadoresMap[cpf]
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
    
    // Try CPF lookup via cpfMap (name -> CPF -> TSE patrimony)
    const cpf = cpfMap[key] || cpfMap[cleanTitle(key)]
    if (cpf && _tseByCpf[cpf]) {
      console.debug('[TSE Match] Via CPF:', nomeUrna, '->', _tseByCpf[cpf])
      return _tseByCpf[cpf]
    }
    
    // Try without title/function
    const cleanKey = cleanTitle(key)
    if (cleanKey !== key && tseMap[cleanKey]) {
      console.debug('[TSE Match] Clean title:', nomeUrna, '->', tseMap[cleanKey])
      return tseMap[cleanKey]
    }
    
    // Try matching against keys with |PARTIDO|UF format (e.g., "NAME|PT|DF")
    for (const tseKey of Object.keys(tseMap)) {
      const namePart = tseKey.split('|')[0]
      if (namePart === key || namePart === cleanKey) {
        console.debug('[TSE Match] Via | format:', nomeUrna, '->', tseMap[tseKey])
        return tseMap[tseKey]
      }
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
    
    // Try partial match (handle |PARTIDO|UF format)
    const partialMatch = Object.entries(tseMap).find(([k]) => {
      const nameFromKey = k.split('|')[0]
      return (
        (nameFromKey.length > 5 && key.includes(nameFromKey.slice(0, 8))) ||
        (key.length > 5 && nameFromKey.includes(key.slice(0, 8))) ||
        (cleanKey.length > 5 && nameFromKey.includes(cleanKey.slice(0, 8))) ||
        (nameFromKey.length > 5 && cleanKey.includes(nameFromKey.slice(0, 8)))
      )
    })
    if (partialMatch) {
      console.debug('[TSE Match] Partial:', nomeUrna, '->', partialMatch[1])
      return partialMatch[1]
    }
    
    // Try first 3 words
    const words3 = key.split(' ').slice(0, 3).join(' ')
    const found3 = Object.entries(tseMap).find(([k]) => {
      const nameFromKey = k.split('|')[0]
      return nameFromKey.startsWith(words3) || words3.startsWith(nameFromKey.slice(0, words3.length))
    })
    if (found3) {
      console.debug('[TSE Match] 3 words:', nomeUrna, '->', found3[1])
      return found3[1]
    }
    
    // Try first 2 words
    const words2 = key.split(' ').slice(0, 2).join(' ')
    const found2 = Object.entries(tseMap).find(([k]) => {
      const nameFromKey = k.split('|')[0]
      return nameFromKey.startsWith(words2) || words2.startsWith(nameFromKey.slice(0, words2.length))
    })
    if (found2) {
      console.debug('[TSE Match] 2 words:', nomeUrna, '->', found2[1])
      return found2[1]
    }
    
    // Try first + last name
    const nameParts = key.split(' ')
    if (nameParts.length >= 2) {
      const firstLast = nameParts[0] + ' ' + nameParts[nameParts.length - 1]
      const foundFL = Object.entries(tseMap).find(([k]) => {
        const nameFromKey = k.split('|')[0]
        return nameFromKey.includes(firstLast) || firstLast.includes(nameFromKey)
      })
      if (foundFL) {
        console.debug('[TSE Match] First+Last:', nomeUrna, '->', foundFL[1])
        return foundFL[1]
      }
    }
    
    // Try last name only (more lenient)
    if (nameParts.length > 1) {
      const lastName = nameParts[nameParts.length - 1]
      if (lastName.length > 4) {
        const matches = Object.entries(tseMap).filter(([k]) => {
          const nameFromKey = k.split('|')[0]
          return nameFromKey.includes(' ' + lastName) || nameFromKey.includes(lastName + ' ')
        })
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
      const partido = raw.ultimoStatus?.siglaPartido ?? raw.siglaPartido ?? ''
      const uf = raw.ultimoStatus?.siglaUf ?? raw.siglaUf ?? ''
      const projetos = projetosMap[raw.id]
      const bancadas = bancadasMap[raw.id]
      const frentes = frentesMap[raw.id]
      const cotas = cotasMap[raw.id]
      const realExpenses = realExpensesMap[raw.id]
      const pixData = findPixByName(urna)
      const temasReais = temasReaisMap[raw.id]
      // Look up presenca by name key
      const presencaKey = `${urna.toUpperCase()}|${partido}|${uf}`
      const presenca = (presencaMap as Record<string, any>)[presencaKey] ?? null
      const financiamento = findFinanciamentoByName(urna)
      const doadores = findDoadoresByName(urna)
      const votacoes = votacoesData?.stats?.[raw.id] ?? null
      const temasData = temasReaisMap[raw.id]
      const temasArray = temasData?.temas || null
      if (financiamento) financiamentoMatched++
      return normalizeDeputado(raw, lookupTse(urna), projetos, bancadas, frentes, cotas, realExpenses, pixData, temasArray, presenca, mandatosMap[raw.id], findProcessosByName(urna), tramitacaoMap[raw.id], financiamento, doadores, votacoes)
    }),
    ...senRaw.map(raw => {
      const ip = raw.IdentificacaoParlamentar ?? {}
      const urna = ip.NomeParlamentar ?? ip.NomeCompletoParlamentar ?? ''
      const idNum = parseInt(ip.CodigoParlamentar ?? '0') || 0
      const senatorReal = senatorRealMap[idNum]
      const senatorLiderancas = senatorLiderancasMap[idNum]
      const senatorComissoes = senatorComissoesMap[idNum]
      return normalizeSenador(raw, lookupTse(urna), senatorReal, senatorLiderancas, senatorComissoes)
    }),
  ]
  
  console.log('[Financiamento] Matched', financiamentoMatched, 'of', depRaw.length, 'deputies (', Math.round(financiamentoMatched/depRaw.length*100) + '% )')
  
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
  { nome: 'PL 1904/2024', desc: 'Tipifica o crime de aborto após 22 semanas em caso de estupro', temaIdx: 7, url: 'https://www.camara.leg.br/propostas-legislativas/2401892' },
  { nome: 'PL 473/2025 - Escala 6x1', desc: 'Proposta de acabar com a escala 6x1 de trabalho', temaIdx: 4, url: 'https://www.camara.leg.br/propostas-legislativas/2544732' },
  { nome: 'PL 1087/2025 - Nº Deputados', desc: 'Aumenta o número de deputados federais de 513 para 543+', temaIdx: 4, url: 'https://www.camara.leg.br/propostas-legislativas/2541087' },
  { nome: 'PLO 29/2025 - LOA 2026', desc: 'Lei Orçamentária Anual com emendas parlamentares', temaIdx: 4, url: 'https://www.camara.leg.br/propostas-legislativas/2529029' },
  { nome: 'PL 2337/2023 - Reforma Tributária', desc: 'Reforma do sistema tributário com IBS e CBS', temaIdx: 4, url: 'https://www.camara.leg.br/propostas-legislativas/2359769' },
  { nome: 'PLP 93/2023 - Arcabouço Fiscal', desc: 'Novo regime fiscal para替换 do teto de gastos', temaIdx: 4, url: 'https://www.camara.leg.br/propostas-legislativas/2363223' },
  { nome: 'PL 2542/2020 - Anistia Partidária', desc: 'Anistia a partidos por irregularidades na prestação de contas', temaIdx: 5, url: 'https://www.camara.leg.br/propostas-legislativas/2292328' },
  { nome: 'PEC 18/2022 - Blindagem', desc: 'Proposta que dificulta cassação de partidos e mandatos', temaIdx: 5, url: 'https://www.camara.leg.br/propostas-legislativas/2210452' },
]

export interface VoteEntry {
  i: number
  pos: 'sim' | 'nao' | 'abs' | 'aus'
  h: number
  temaIdx: number
  tema: typeof TEMAS[number]
  nome: string
  desc: string
  url: string
  data: string
  votingId?: string
}

type ProposicaoCache = {
  [votingId: string]: {
    votingId: string
    data: string
    descricao: string
    ementa: string
    proposicao: {
      id: number
      siglaTipo: string
      numero: number
      ano: number
      ementa: string
      url: string
    } | null
    siglaNumero: string
  }
}

type VotacoesDetalhes = {
  votesByDeputy: {
    [deputyId: string]: {
      deputyId: number
      nome: string
      partido: string
      uf: string
      votes: {
        votingId: string
        data: string
        voto: string
        proposicao: null
      }[]
    }
  }
}

let _votacoesDetalhesCache: VotacoesDetalhes | null = null
let _proposicoesFullCache: ProposicaoCache | null = null

async function loadVotacoesDetalhesCache(): Promise<VotacoesDetalhes | null> {
  if (_votacoesDetalhesCache) return _votacoesDetalhesCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const res = await fetch(`${base}/data/votacoes-detalhes.json?t=${Date.now()}`, { cache: 'force-cache' })
    if (res.ok) {
      _votacoesDetalhesCache = await res.json()
      return _votacoesDetalhesCache
    }
  } catch (e) {
    console.error('[Votações Detalhes Error]', e)
  }
  return null
}

async function loadProposicoesFullCache(): Promise<ProposicaoCache | null> {
  if (_proposicoesFullCache) return _proposicoesFullCache
  
  try {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '') : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000')
    const res = await fetch(`${base}/data/votacoes-proposicoes.json?t=${Date.now()}`, { cache: 'force-cache' })
    if (res.ok) {
      const data = await res.json()
      _proposicoesFullCache = data.propositions
      return _proposicoesFullCache
    }
  } catch (e) {
    console.error('[Proposições Error]', e)
  }
  return null
}

function inferThemeFromEmenta(ementa: string): number {
  const e = ementa.toLowerCase()
  if (/tribut| impost| receita| orçament| financeiro| fiscal/.test(e)) return 4 // Economia
  if (/saúde| médico| hospital| sus| vacc| epidemi/.test(e)) return 0 // Saúde
  if (/educaç| escola| univers| ensino| professor/.test(e)) return 2 // Educação
  if (/ambiental| meio ambiente| clima| preservaç| desmatamento| amazônia/.test(e)) return 5 // Ambiental
  if (/segurança| crime| armament| pistol| droga| violentaç/.test(e)) return 1 // Segurança
  if (/agro| rural| agríc| pecu| fundiár| reforma agrár/.test(e)) return 3 // Agropecuária
  if (/direito| constituiç| lei| judiciári| ministerío público|civil|código/.test(e)) return 7 // Direitos
  if (/trabalh| emprego| lavor| contrat| previdenc/.test(e)) return 6 // Trabalho
  return 4 // Default to economia
}

export async function realVotesToChartData(votacoesReais: Parlamentar['votacoesReais'], deputyId: number): Promise<VoteEntry[]> {
  const votacoesDetalhesData = await loadVotacoesDetalhesCache()
  if (!votacoesDetalhesData) {
    return mockVotes(deputyId) as VoteEntry[]
  }
  
  const proposicoesCacheData = await loadProposicoesFullCache()
  
  const deputyData = votacoesDetalhesData.votesByDeputy[deputyId]
  
  if (deputyData && deputyData.votes && deputyData.votes.length > 0) {
    const votes: VoteEntry[] = []
    
    const sortedVotes = [...deputyData.votes].sort((a, b) => 
      a.data.localeCompare(b.data)
    )
    
    for (let i = 0; i < sortedVotes.length; i++) {
      const vote = sortedVotes[i]
      const prop = proposicoesCacheData?.[vote.votingId]
      
      const propNome = prop?.siglaNumero || prop?.descricao?.substring(0, 40) || `Votação ${vote.votingId}`
      const propEmenta = prop?.ementa || prop?.descricao || ''
      const propUrl = prop?.proposicao?.url || `https://www.camara.leg.br/propostas-legislativas/${vote.votingId}`
      const propData = prop?.data || vote.data
      
      const temaIdx = inferThemeFromEmenta(propEmenta)
      
      const votoLower = vote.voto.toLowerCase()
      let pos: 'sim' | 'nao' | 'abs' | 'aus' = 'aus'
      if (votoLower === 'sim') pos = 'sim'
      else if (votoLower === 'não' || votoLower === 'nao') pos = 'nao'
      else if (votoLower === 'abstenção' || votoLower === 'abstencao') pos = 'abs'
      else if (votoLower === 'obstrução' || votoLower === 'obstrucao') pos = 'abs'
      
      const dataFormatada = propData ? propData.split('-').reverse().join('/') : ''
      
      votes.push({
        i,
        pos,
        h: 60 + Math.floor(Math.abs(i % 10 - 5) * 10),
        temaIdx,
        tema: TEMAS[temaIdx],
        nome: propNome,
        desc: propEmenta.substring(0, 100),
        url: propUrl,
        data: dataFormatada,
        votingId: vote.votingId
      })
    }
    
    return votes
  }
  
  if (!votacoesReais || votacoesReais.totalVotacoes === 0) {
    return mockVotes(deputyId) as VoteEntry[]
  }
  
  const { sim, nao, abstencao, obstrucao, presente, ausente } = votacoesReais
  const rng = mulberry32(deputyId)
  
  const votes: VoteEntry[] = []
  let i = 0
  
  for (let s = 0; s < sim; s++) {
    const proj = PROJETOS_NOMES[Math.floor(rng() * PROJETOS_NOMES.length)]
    const temaIdx = proj.temaIdx
    const data = `2025-${String(Math.floor(rng() * 3) + 1).padStart(2,'0')}-${String(Math.floor(1 + rng() * 28)).padStart(2,'0')}`
    votes.push({ i: i++, pos: 'sim', h: Math.floor(40 + rng() * 100), temaIdx, tema: TEMAS[temaIdx], nome: proj.nome, desc: proj.desc, url: proj.url, data })
  }
  for (let n = 0; n < nao; n++) {
    const proj = PROJETOS_NOMES[Math.floor(rng() * PROJETOS_NOMES.length)]
    const temaIdx = proj.temaIdx
    const data = `2025-${String(Math.floor(rng() * 3) + 1).padStart(2,'0')}-${String(Math.floor(1 + rng() * 28)).padStart(2,'0')}`
    votes.push({ i: i++, pos: 'nao', h: Math.floor(40 + rng() * 100), temaIdx, tema: TEMAS[temaIdx], nome: proj.nome, desc: proj.desc, url: proj.url, data })
  }
  for (let a = 0; a < abstencao; a++) {
    const proj = PROJETOS_NOMES[Math.floor(rng() * PROJETOS_NOMES.length)]
    const temaIdx = proj.temaIdx
    const data = `2025-${String(Math.floor(rng() * 3) + 1).padStart(2,'0')}-${String(Math.floor(1 + rng() * 28)).padStart(2,'0')}`
    votes.push({ i: i++, pos: 'abs', h: Math.floor(40 + rng() * 100), temaIdx, tema: TEMAS[temaIdx], nome: proj.nome, desc: proj.desc, url: proj.url, data })
  }
  for (let o = 0; o < obstrucao; o++) {
    const proj = PROJETOS_NOMES[Math.floor(rng() * PROJETOS_NOMES.length)]
    const temaIdx = proj.temaIdx
    const data = `2025-${String(Math.floor(rng() * 3) + 1).padStart(2,'0')}-${String(Math.floor(1 + rng() * 28)).padStart(2,'0')}`
    votes.push({ i: i++, pos: 'aus', h: Math.floor(40 + rng() * 100), temaIdx, tema: TEMAS[temaIdx], nome: proj.nome, desc: proj.desc, url: proj.url, data })
  }
  for (let pr = 0; pr < presente; pr++) {
    const proj = PROJETOS_NOMES[Math.floor(rng() * PROJETOS_NOMES.length)]
    const temaIdx = proj.temaIdx
    const data = `2025-${String(Math.floor(rng() * 3) + 1).padStart(2,'0')}-${String(Math.floor(1 + rng() * 28)).padStart(2,'0')}`
    votes.push({ i: i++, pos: 'sim', h: Math.floor(40 + rng() * 100), temaIdx, tema: TEMAS[temaIdx], nome: proj.nome, desc: proj.desc, url: proj.url, data })
  }
  for (let au = 0; au < ausente; au++) {
    const proj = PROJETOS_NOMES[Math.floor(rng() * PROJETOS_NOMES.length)]
    const temaIdx = proj.temaIdx
    const data = `2025-${String(Math.floor(rng() * 3) + 1).padStart(2,'0')}-${String(Math.floor(1 + rng() * 28)).padStart(2,'0')}`
    votes.push({ i: i++, pos: 'aus', h: Math.floor(40 + rng() * 100), temaIdx, tema: TEMAS[temaIdx], nome: proj.nome, desc: proj.desc, url: proj.url, data })
  }
  
  return votes
}

export function mockVotes(seed: number) {
  const rng = mulberry32(seed)
  return Array.from({ length: 60 }, (_, i) => {
    const r = rng()
    const pos = r < 0.55 ? 'sim' : r < 0.8 ? 'nao' : r < 0.95 ? 'abs' : 'aus'
    const proj = PROJETOS_NOMES[Math.floor(rng() * PROJETOS_NOMES.length)]
    const temaIdx = proj.temaIdx
    const dia = Math.floor(1 + rng() * 28)
    const mes = Math.floor(1 + rng() * 12)
    const ano = 2023 + Math.floor(rng() * 2)
    const data = `${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}`
    return { i, pos, h: Math.floor(30 + rng() * 130), temaIdx, tema: TEMAS[temaIdx], nome: proj.nome, desc: proj.desc, url: proj.url, data }
  })
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
