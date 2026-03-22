import * as fs from 'fs'
import * as path from 'path'

const CAMARA_API = 'https://dadosabertos.camara.leg.br/api/v2'

const VOTES_HL_IDS = [
  { id: '2387004', nome: 'PL da Anistia', tipo: 'PL' },
  { id: '2336586', nome: 'PL do Aborto', tipo: 'PL' },
  { id: '2444433', nome: 'PEC 6x1', tipo: 'PEC' },
  { id: '2384527', nome: 'Reforma Tributária', tipo: 'PL' },
  { id: '2412228', nome: 'PL dos Penduricalhos', tipo: 'PL' },
  { id: '2348784', nome: 'PL da Bandidagem', tipo: 'PL' },
]

interface VotacaoDetail {
  id: string
  nome: string
  data: string
  resultado: string
  totalSim: number
  totalNao: number
  totalAbstencao: number
  totalAusente: number
  votos: {
    deputyId: number
    nome: string
    partido: string
    uf: string
    voto: string
  }[]
}

async function fetchVotacaoDetail(id: string, nome: string): Promise<VotacaoDetail | null> {
  try {
    // Get voting details
    const res = await fetch(`${CAMARA_API}/votacoes/${id}/votos`)
    if (!res.ok) {
      console.log(`Failed to fetch voting ${id}`)
      return null
    }

    const json = await res.json()
    const dados = json.dados

    if (!dados || !dados.votos) {
      return null
    }

    const detail: VotacaoDetail = {
      id,
      nome,
      data: dados.data || '',
      resultado: dados.resultado || '',
      totalSim: 0,
      totalNao: 0,
      totalAbstencao: 0,
      totalAusente: 0,
      votos: [],
    }

    // Process votes
    for (const v of dados.votos) {
      const deputy = v.deputado
      if (!deputy) continue

      const voto = v.tipoVoto || 'Ausente'
      detail.votos.push({
        deputyId: deputy.id,
        nome: deputy.nome || '',
        partido: deputy.siglaPartido || '',
        uf: deputy.siglaUf || '',
        voto,
      })

      if (voto === 'Sim') detail.totalSim++
      else if (voto === 'Não') detail.totalNao++
      else if (voto === 'Abstenção') detail.totalAbstencao++
      else detail.totalAusente++
    }

    return detail
  } catch (e) {
    console.error(`Error fetching voting ${id}:`, e)
    return null
  }
}

async function main() {
  console.log('Fetching real voting records for highlight propositions...')

  const results: Record<string, VotacaoDetail> = {}

  for (const prop of VOTES_HL_IDS) {
    console.log(`Fetching ${prop.nome} (${prop.id})...`)
    const data = await fetchVotacaoDetail(prop.id, prop.nome)
    if (data) {
      results[prop.id] = data
      console.log(`  - ${data.votos.length} votes, ${data.totalSim} SIM, ${data.totalNao} NÃO`)
    }
    await new Promise(r => setTimeout(r, 200))
  }

  const outputPath = path.join(process.cwd(), 'public', 'data', 'votacoes-highlights-real.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\nSaved to ${outputPath}`)
}

main().catch(console.error)
