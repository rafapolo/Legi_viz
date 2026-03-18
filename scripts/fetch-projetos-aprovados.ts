/**
 * Script para buscar projetos aprovados de todos os deputados
 * e salvar em um arquivo JSON para uso offline
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

const OUTPUT_FILE = join(process.cwd(), 'public/data/projetos-aprovados.json')

interface Deputado {
  id: number
  nome: string
}

async function fetchDeputados(): Promise<Deputado[]> {
  const deputados: Deputado[] = []
  
  for (let page = 1; page <= 6; page++) {
    const url = `https://dadosabertos.camara.leg.br/api/v2/deputados?idLegislatura=57&itens=100&ordem=ASC&ordenarPor=nome&pagina=${page}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) break
    
    const j = await res.json()
    const dados = j.dados ?? []
    if (dados.length === 0) break
    
    dados.forEach((d: any) => {
      deputados.push({ id: d.id, nome: d.ultimoStatus?.nomeEleitoral ?? d.nome })
    })
    console.log(`[Deputados] Page ${page}: ${dados.length}, total: ${deputados.length}`)
  }
  
  return deputados
}

async function fetchProposicoesAprovadas(deputyId: number): Promise<number> {
  try {
    // Filter: only bills (PL, PLP, PEC) from 2022+ (current legislature) that became law
    const url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?idDeputadoAutor=${deputyId}&codSituacao=1140&dataApresentacaoInicio=2022-01-01&siglaTipo=PL,PLP,PEC&itens=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return 0
    
    const j = await res.json()
    const links = j.links ?? []
    const lastLink = links.find((l: any) => l.rel === 'last')
    if (lastLink) {
      const match = lastLink.href.match(/pagina=(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    }
    return (j.dados ?? []).length
  } catch (e) {
    console.error(`[Error] Deputy ${deputyId}:`, e)
    return 0
  }
}

async function main() {
  console.log('📥 Fetching deputados...')
  const deputados = await fetchDeputados()
  console.log(`   Total: ${deputados.length} deputados\n`)
  
  const projetos: Record<number, number> = {}
  
  console.log('📊 Fetching approved propositions...')
  for (let i = 0; i < deputados.length; i++) {
    const d = deputados[i]
    const count = await fetchProposicoesAprovadas(d.id)
    projetos[d.id] = count
    
    if ((i + 1) % 25 === 0 || i === deputados.length - 1) {
      console.log(`   Progress: ${i + 1}/${deputados.length} (${Math.round((i + 1) / deputados.length * 100)}%)`)
    }
    
    // Small delay to avoid rate limiting
    if ((i + 1) % 50 === 0) {
      await new Promise(r => setTimeout(r, 500))
    }
  }
  
  console.log('\n💾 Saving to', OUTPUT_FILE)
  writeFileSync(OUTPUT_FILE, JSON.stringify(projetos, null, 2))
  
  // Stats
  const counts = Object.values(projetos)
  const withProjects = counts.filter(c => c > 0).length
  const total = counts.reduce((a, b) => a + b, 0)
  const max = Math.max(...counts)
  const avg = total / counts.length
  
  console.log('\n📈 Statistics:')
  console.log(`   Deputies with approved projects: ${withProjects}`)
  console.log(`   Total approved projects: ${total}`)
  console.log(`   Average per deputy: ${avg.toFixed(1)}`)
  console.log(`   Maximum: ${max}`)
  console.log('\n✅ Done!')
}

main().catch(console.error)
