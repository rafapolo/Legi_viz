/**
 * Script para buscar despesas (cotas) dos deputados
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

const OUTPUT_FILE = join(process.cwd(), 'public/data/cotas.json')

interface Deputy {
  id: number
  nome: string
}

async function fetchDeputados(): Promise<Deputy[]> {
  const deputados: Deputy[] = []
  
  for (let page = 1; page <= 10; page++) {
    const url = `https://dadosabertos.camara.leg.br/api/v2/deputados?idLegislatura=57&itens=100&pagina=${page}`
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

async function fetchDespesasTotal(deputyId: number): Promise<number> {
  try {
    // Get total from last page
    const url = `https://dadosabertos.camara.leg.br/api/v2/deputados/${deputyId}/despesas?itens=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return 0
    
    const j = await res.json()
    const links = j.links ?? []
    const lastLink = links.find((l: any) => l.rel === 'last')
    
    if (lastLink) {
      const match = lastLink.href.match(/pagina=(\d+)/)
      const totalPages = match ? parseInt(match[1], 10) : 0
      return totalPages
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
  
  const cotas: Record<number, number> = {}
  
  console.log('📊 Fetching expenses (this may take a while)...')
  for (let i = 0; i < deputados.length; i++) {
    const d = deputados[i]
    const totalPages = await fetchDespesasTotal(d.id)
    cotas[d.id] = totalPages
    
    if ((i + 1) % 25 === 0 || i === deputados.length - 1) {
      console.log(`   Progress: ${i + 1}/${deputados.length} (${Math.round((i + 1) / deputados.length * 100)}%)`)
    }
    
    // Small delay to avoid rate limiting
    if ((i + 1) % 50 === 0) {
      await new Promise(r => setTimeout(r, 500))
    }
  }
  
  console.log('\n💾 Saving to', OUTPUT_FILE)
  writeFileSync(OUTPUT_FILE, JSON.stringify(cotas, null, 2))
  
  // Stats
  const counts = Object.values(cotas)
  const nonZero = counts.filter(c => c > 0).length
  const total = counts.reduce((a, b) => a + b, 0)
  const max = Math.max(...counts, 0)
  const min = Math.min(...counts.filter(c => c > 0), 0)
  const avg = total / counts.length
  
  console.log('\n📈 Statistics:')
  console.log(`   Deputies with expenses: ${nonZero}`)
  console.log(`   Total expense records: ${total}`)
  console.log(`   Average per deputy: ${avg.toFixed(1)}`)
  console.log(`   Max: ${max}`)
  console.log(`   Min: ${min}`)
  
  // Top spenders
  const sorted = Object.entries(cotas).sort((a, b) => b[1] - a[1])
  console.log('\n🔝 Top 5 spenders:')
  sorted.slice(0, 5).forEach(([id, count]) => {
    const dep = deputados.find(d => d.id === parseInt(id))
    console.log(`   ${dep?.nome || id}: ${count} expenses`)
  })
  
  console.log('\n✅ Done!')
}

main().catch(console.error)
