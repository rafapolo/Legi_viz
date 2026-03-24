/**
 * API Route para carregar parlamentares (contorna CORS)
 */

export const dynamic = 'force-static'

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Depurados cassados ou renunciados (até 2024)
// Fonte: TSE, Câmara dos Deputados
const CASSADOS: Record<number, string> = {
  // 2023-2024 cassações
  220705: 'Cassado pelo TSE em jun/2023 (infidelidade partidária)',
  220634: 'Cassado pelo TSE em nov/2023 (infidelidade partidária)',
  // Adicionar mais conforme necessário
}

function loadVotacoesReais(): Record<number, any> {
  try {
    const path = join(process.cwd(), 'public/data/votacoes-real.json')
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, 'utf8'))
      return data.stats || {}
    }
  } catch (e) {
    console.log('[API] Failed to load votacoes-real.json:', e)
  }
  return {}
}

interface RawDeputado {
  id: number
  nome: string
  nomeCivil?: string
  siglaPartido?: string
  siglaUf?: string
  urlFoto?: string
  email?: string
  sexo?: string
  sexoAPI?: string
  dataNascimento?: string
  escolaridade?: string
  cassado?: string
}

interface RawDeputado {
  id: number
  nome: string
  nomeCivil?: string
  siglaPartido?: string
  siglaUf?: string
  urlFoto?: string
  email?: string
  sexo?: string
  sexoAPI?: string
  dataNascimento?: string
  escolaridade?: string
  cassado?: string
}

interface RawSenador {
  IdentificacaoParlamentar?: {
    CodigoParlamentar?: string
    NomeParlamentar?: string
    NomeCompletoParlamentar?: string
    SexoParlamentar?: string
    UrlFotoParlamentar?: string
    EmailParlamentar?: string
    SiglaPartidoParlamentar?: string
    UfParlamentar?: string
  }
}

export async function GET() {
  try {
    const depRaw: RawDeputado[] = []
    const baseUrl = 'https://dadosabertos.camara.leg.br/api/v2/deputados'
    // Don't filter by idLegislatura - it returns all historical data
    // Just get the current 513 deputies
    const params = 'itens=100&ordem=ASC&ordenarPor=nome'
    
    // Fetch ALL pages - should be exactly 513 deputies
    let page = 1
    let hasMore = true
    while (hasMore) {
      const url = `${baseUrl}?${params}&pagina=${page}`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (res.ok) {
        const j = await res.json()
        const dados = j.dados ?? []
        if (dados.length === 0) {
          hasMore = false
        } else {
          depRaw.push(...dados)
          console.log(`[API] Page ${page}: ${dados.length} deputies, total: ${depRaw.length}`)
          page++
          // Safety limit - 513 deputies / 100 per page = ~6 pages
          if (page > 10) {
            console.log('[API] Safety limit reached')
            break
          }
        }
      } else {
        hasMore = false
      }
    }
    console.log(`[API] Total deputies fetched: ${depRaw.length}`)

    // Fetch gender from SOAP API (more accurate)
    const genderMap = new Map<number, string>()
    try {
      console.log('[API] Fetching SOAP gender data...')
      const soapRes = await fetch('https://www.camara.gov.br/SitCamaraWS/Deputados.asmx/ObterDeputados', {
        headers: { Accept: 'application/xml' }
      })
      console.log('[API] SOAP response status:', soapRes.status)
      if (soapRes.ok) {
        const text = await soapRes.text()
        console.log('[API] SOAP response length:', text.length)
        
        // Simple XML parsing - extract ideCadastro and sexo pairs
        const regex = /<deputado>[\s\S]*?<ideCadastro>(\d+)<\/ideCadastro>[\s\S]*?<sexo>([^<]+)<\/sexo>[\s\S]*?<\/deputado>/g
        let match
        while ((match = regex.exec(text)) !== null) {
          const id = parseInt(match[1])
          const sexo = match[2]
          genderMap.set(id, sexo === 'feminino' ? 'F' : 'M')
        }
        console.log('[API] SOAP Gender loaded:', genderMap.size, 'entries')
        
        // Sample
        const sample = Array.from(genderMap.entries()).slice(0, 5)
        console.log('[API] SOAP Sample:', sample)
      }
    } catch (e) {
      console.log('[API] SOAP Gender fetch failed:', e)
    }

    // Apply gender from SOAP map
    const depRawWithGender = depRaw.map(d => ({
      ...d,
      sexoAPI: genderMap.get(d.id) || d.sexo
    }))

    let senRaw: RawSenador[] = []
    try {
      const res = await fetch(
        'https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json',
        { headers: { Accept: 'application/json' } }
      )
      if (res.ok) {
        const j = await res.json()
        senRaw = j?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar ?? []
      }
    } catch { /* ignore */ }
    
    // Log gender distribution
    const genders = depRawWithGender.reduce((acc, d) => {
      const g = d.sexoAPI === 'F' ? 'Mulher' : 'Homem'
      acc[g] = (acc[g] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log('[API] Gender distribution:', genders)
    
    // Add cassado status
    const depRawWithCassado = depRawWithGender.map(d => ({
      ...d,
      cassado: CASSADOS[d.id] || undefined
    }))
    
    // Load real voting data
    const votacoesReais = loadVotacoesReais()
    console.log('[API] Loaded votacoesReais for', Object.keys(votacoesReais).length, 'deputies')
    
    return Response.json({
      deputados: depRawWithCassado,
      senadores: senRaw,
      counts: {
        deputados: depRawWithCassado.length,
        senadores: senRaw.length,
        total: depRawWithCassado.length + senRaw.length,
      },
      votacoesReais
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
    })
  } catch (error) {
    console.error('[API parlementaires]', error)
    return Response.json({ error: 'Failed to fetch parlementaires' }, { status: 500 })
  }
}
