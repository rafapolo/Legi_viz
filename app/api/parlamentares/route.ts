/**
 * API Route para carregar parlamentares (contorna CORS)
 */

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
    const params = 'idLegislatura=57&itens=100&ordem=ASC&ordenarPor=nome'
    
    for (let page = 1; page <= 6; page++) {
      const url = `${baseUrl}?${params}&pagina=${page}`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (res.ok) {
        const j = await res.json()
        const dados = j.dados ?? []
        if (dados.length === 0) break
        depRaw.push(...dados)
      } else {
        break
      }
    }

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
    
    return Response.json({
      deputados: depRawWithGender,
      senadores: senRaw,
      counts: {
        deputados: depRawWithGender.length,
        senadores: senRaw.length,
        total: depRawWithGender.length + senRaw.length,
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
    })
  } catch (error) {
    console.error('[API parlementaires]', error)
    return Response.json({ error: 'Failed to fetch parlementaires' }, { status: 500 })
  }
}
