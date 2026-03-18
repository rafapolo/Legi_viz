/**
 * Script para buscar bancadas/frentes reais da API da Câmara
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

const OUTPUT_FILE = join(process.cwd(), 'public/data/bancadas.json')

interface Deputy {
  id: number
  nome: string
}

async function fetchDeputados(): Promise<Deputy[]> {
  const deputados: Deputy[] = []
  let page = 1
  let hasMore = true
  
  while (hasMore) {
    const url = `https://dadosabertos.camara.leg.br/api/v2/deputados?idLegislatura=57&itens=100&ordem=ASC&ordenarPor=nome&pagina=${page}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) break
    
    const j = await res.json()
    const dados = j.dados ?? []
    if (dados.length === 0) {
      hasMore = false
    } else {
      dados.forEach((d: any) => {
        deputados.push({ id: d.id, nome: d.ultimoStatus?.nomeEleitoral ?? d.nome })
      })
      console.log(`[Deputados] Page ${page}: ${dados.length}, total: ${deputados.length}`)
      page++
      // Safety limit
      if (page > 20) {
        console.log('[Deputados] Safety limit reached')
        break
      }
    }
  }
  
  return deputados
}

async function fetchAllFrentes(): Promise<any[]> {
  const frentes: any[] = []
  
  for (let page = 1; page <= 15; page++) {
    const url = `https://dadosabertos.camara.leg.br/api/v2/frentes?itens=100&pagina=${page}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) break
    
    const j = await res.json()
    const dados = j.dados ?? []
    if (dados.length === 0) break
    
    frentes.push(...dados)
    console.log(`[Frentes] Page ${page}: ${dados.length}, total: ${frentes.length}`)
  }
  
  return frentes
}

async function fetchFrenteMembers(frenteId: number): Promise<number[]> {
  try {
    const res = await fetch(`https://dadosabertos.camara.leg.br/api/v2/frentes/${frenteId}/membros`, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    
    const j = await res.json()
    const dados = j.dados ?? []
    return dados.map((m: any) => m.id)
  } catch {
    return []
  }
}

function categorizeFrente(titulo: string): string | null {
  const t = titulo.toLowerCase()
  
  // Evangelical - specific fronts
  if (t.includes('evangélica') || t.includes('evangelical') || t.includes('cristã') || t.includes('cristão')) {
    return 'Evangelica'
  }
  // Rural - agriculture, farming
  if (t.includes('agropecuár') || t.includes('agrária') || t.includes('fundiária') || t.includes('conectividade rural') || t.includes('agricultura familiar')) {
    return 'Ruralista'
  }
  // Security/Police - specifically security related
  if ((t.includes('segurança') || t.includes('polícia') || t.includes('policial')) && !t.includes('saúde')) {
    return 'Bala'
  }
  // Business - companies, industry
  if ((t.includes('indústria') || t.includes('empresarial') || t.includes('negócios') || t.includes('comérc')) && !t.includes('defesa')) {
    return 'Empresarial'
  }
  // Workers/Unions
  if (t.includes('trabalhador') || t.includes('sindicato') || t.includes('servidor público') || t.includes('funcionário')) {
    return 'Sindical'
  }
  // Environment
  if (t.includes('meio ambiente') || t.includes('ambiental') || t.includes('sustentável') || t.includes('clima') || t.includes('verde')) {
    return 'Ambientalista'
  }
  // Women
  if (t.includes('mulher') || t.includes('feminino') || t.includes('gênero')) {
    return 'Feminina'
  }
  // Black/Race - combate às desigualdades, periferia, etc
  if (t.includes('desigualdad') || t.includes('periferia') || t.includes('quilombo') || t.includes('afro') || t.includes('raça') || t.includes('negro')) {
    return 'Negra'
  }
  
  return null
}

async function main() {
  console.log('📥 Fetching frentes...')
  const frentes = await fetchAllFrentes()
  console.log(`   Total: ${frentes.length} frentes\n`)
  
  // Categorize frentes
  const frentesPorCategoria: Record<string, number[]> = {
    Evangelica: [],
    Ruralista: [],
    Bala: [],
    Empresarial: [],
    Sindical: [],
    Ambientalista: [],
    Feminina: [],
    Negra: [],
  }
  
  console.log('🏷️ Categorizing frentes...')
  for (const frente of frentes) {
    const categoria = categorizeFrente(frente.titulo)
    if (categoria && frente.idLegislatura === 57) {
      frentesPorCategoria[categoria].push(frente.id)
      console.log(`   ${categoria}: ${frente.titulo.substring(0, 60)}...`)
    }
  }
  
  console.log('\n📊 Fetching members for each categoria...')
  const deputyBancadas: Record<number, string[]> = {}
  
  for (const [categoria, frenteIds] of Object.entries(frentesPorCategoria)) {
    console.log(`   ${categoria}: ${frenteIds.length} frentes`)
    
    for (const frenteId of frenteIds) {
      const memberIds = await fetchFrenteMembers(frenteId)
      
      for (const memberId of memberIds) {
        if (!deputyBancadas[memberId]) {
          deputyBancadas[memberId] = []
        }
        if (!deputyBancadas[memberId].includes(categoria)) {
          deputyBancadas[memberId].push(categoria)
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100))
    }
  }
  
  console.log('\n💾 Saving to', OUTPUT_FILE)
  writeFileSync(OUTPUT_FILE, JSON.stringify(deputyBancadas, null, 2))
  
  // Stats
  const counts = Object.values(deputyBancadas).map(b => b.length)
  const withBancada = counts.filter(c => c > 0).length
  const max = Math.max(...counts, 0)
  
  console.log('\n📈 Statistics:')
  console.log(`   Deputies with bancadas: ${withBancada}`)
  console.log(`   Max bancadas per deputy: ${max}`)
  console.log(`   Bancada distribution:`)
  const catCounts: Record<string, number> = {}
  for (const bancadas of Object.values(deputyBancadas)) {
    for (const b of bancadas) {
      catCounts[b] = (catCounts[b] || 0) + 1
    }
  }
  for (const [cat, count] of Object.entries(catCounts)) {
    console.log(`      ${cat}: ${count}`)
  }
  
  console.log('\n✅ Done!')
}

main().catch(console.error)
