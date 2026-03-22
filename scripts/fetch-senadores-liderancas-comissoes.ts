import * as fs from 'fs'
import * as path from 'path'

const SENATE_API = 'https://legis.senado.leg.br/dadosabertos'

interface SenatorLeadership {
  codigo: number
  nome: string
  liderancas: {
    tipo: string
    partido: string
    dataInicio: string
    dataFim?: string
  }[]
}

interface SenatorCommissions {
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

async function fetchSenatorLiderancas(codigo: number, nome: string): Promise<SenatorLeadership> {
  const data: SenatorLeadership = {
    codigo,
    nome,
    liderancas: [],
  }

  try {
    const res = await fetch(`${SENATE_API}/senador/${codigo}/liderancas`)
    if (!res.ok) return data

    const xml = await res.text()
    
    // Extract Lideranca blocks
    const liderancaMatches = xml.match(/<Lideranca>[\s\S]*?<\/Lideranca>/g)
    if (liderancaMatches) {
      for (const block of liderancaMatches) {
        const tipoMatch = block.match(/<DescricaoTipoLideranca>([^<]+)<\/DescricaoTipoLideranca>/)
        const partidoMatch = block.match(/<SiglaPartido>([^<]+)<\/SiglaPartido>/)
        const inicioMatch = block.match(/<DataDesignacao>(\d{4}-\d{2}-\d{2})<\/DataDesignacao>/)
        const fimMatch = block.match(/<DataFim>(\d{4}-\d{2}-\d{2})<\/DataFim>/)

        if (tipoMatch) {
          data.liderancas.push({
            tipo: tipoMatch[1],
            partido: partidoMatch?.[1] || '',
            dataInicio: inicioMatch?.[1] || '',
            dataFim: fimMatch?.[1],
          })
        }
      }
    }
  } catch (e) {
    console.error(`Error fetching liderancas for ${codigo}:`, e)
  }

  return data
}

async function fetchSenatorComissoes(codigo: number, nome: string): Promise<SenatorCommissions> {
  const data: SenatorCommissions = {
    codigo,
    nome,
    comissoes: [],
  }

  try {
    const res = await fetch(`${SENATE_API}/senador/${codigo}/comissoes`)
    if (!res.ok) return data

    const xml = await res.text()
    
    // Extract Comissao blocks
    const comissaoMatches = xml.match(/<Comissao>[\s\S]*?<\/Comissao>/g)
    if (comissaoMatches) {
      for (const block of comissaoMatches) {
        const idMatch = block.match(/<CodigoComissao>(\d+)<\/CodigoComissao>/)
        const siglaMatch = block.match(/<SiglaComissao>([^<]+)<\/SiglaComissao>/)
        const nomeMatch = block.match(/<NomeComissao>([^<]+)<\/NomeComissao>/)
        const cargoMatch = block.match(/<DescricaoParticipacao>([^<]+)<\/DescricaoParticipacao>/)
        const inicioMatch = block.match(/<DataInicio>(\d{4}-\d{2}-\d{2})<\/DataInicio>/)
        const fimMatch = block.match(/<DataFim>(\d{4}-\d{2}-\d{2})<\/DataFim>/)

        if (idMatch && siglaMatch) {
          data.comissoes.push({
            id: parseInt(idMatch[1]),
            sigla: siglaMatch[1],
            nome: nomeMatch?.[1] || '',
            cargo: cargoMatch?.[1] || 'Membro',
            dataInicio: inicioMatch?.[1] || '',
            dataFim: fimMatch?.[1],
          })
        }
      }
    }
  } catch (e) {
    console.error(`Error fetching comissoes for ${codigo}:`, e)
  }

  return data
}

async function main() {
  const res = await fetch(`${SENATE_API}/senador/lista/atual.json`)
  if (!res.ok) {
    console.error('Failed to fetch senators list')
    process.exit(1)
  }

  const json = await res.json()
  const parlamentares = json.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || []
  console.log(`Found ${parlamentares.length} senators`)

  const liderancasOutput = path.join(process.cwd(), 'public', 'data', 'senadores-liderancas.json')
  const comissoesOutput = path.join(process.cwd(), 'public', 'data', 'senadores-comissoes.json')
  
  const existingLiderancas: Record<number, SenatorLeadership> = {}
  const existingComissoes: Record<number, SenatorCommissions> = {}
  
  if (fs.existsSync(liderancasOutput)) {
    try { Object.assign(existingLiderancas, JSON.parse(fs.readFileSync(liderancasOutput, 'utf8'))) } catch {}
  }
  if (fs.existsSync(comissoesOutput)) {
    try { Object.assign(existingComissoes, JSON.parse(fs.readFileSync(comissoesOutput, 'utf8'))) } catch {}
  }

  let fetchedL = 0
  let fetchedC = 0

  for (const p of parlamentares) {
    const ip = p.IdentificacaoParlamentar
    if (!ip) continue

    const codigo = parseInt(ip.CodigoParlamentar)
    if (!codigo) continue

    const nome = ip.NomeParlamentar || ''
    
    // Fetch liderancas
    if (!existingLiderancas[codigo]) {
      console.log(`Fetching liderancas: ${nome}...`)
      const data = await fetchSenatorLiderancas(codigo, nome)
      existingLiderancas[codigo] = data
      fetchedL++
    }
    
    // Fetch comissoes
    if (!existingComissoes[codigo]) {
      console.log(`Fetching comissoes: ${nome}...`)
      const data = await fetchSenatorComissoes(codigo, nome)
      existingComissoes[codigo] = data
      fetchedC++
    }

    // Save progress every 10
    if ((fetchedL + fetchedC) % 10 === 0) {
      fs.writeFileSync(liderancasOutput, JSON.stringify(existingLiderancas, null, 2))
      fs.writeFileSync(comissoesOutput, JSON.stringify(existingComissoes, null, 2))
      console.log(`Progress: ${fetchedL} liderancas, ${fetchedC} comissoes`)
    }

    await new Promise(r => setTimeout(r, 100))
  }

  fs.writeFileSync(liderancasOutput, JSON.stringify(existingLiderancas, null, 2))
  fs.writeFileSync(comissoesOutput, JSON.stringify(existingComissoes, null, 2))
  
  console.log(`\nDone! Fetched ${fetchedL} liderancas, ${fetchedC} comissoes`)
  
  // Summary
  const withLiderancas = Object.values(existingLiderancas).filter(l => l.liderancas.length > 0).length
  const withComissoes = Object.values(existingComissoes).filter(c => c.comissoes.length > 0).length
  console.log(`Senators with leadership: ${withLiderancas}`)
  console.log(`Senators with commissions: ${withComissoes}`)
}

main().catch(console.error)
