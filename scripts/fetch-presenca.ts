/**
 * Script para buscar dados de presença dos deputados e salvar com match por nome
 * Run with: npx tsx scripts/fetch-presenca.ts
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

const OUTPUT_FILE = join(process.cwd(), 'public/data/presenca-real.json')
const OUTPUT_BY_NAME = join(process.cwd(), 'public/data/presenca-by-name.json')

async function fetchPresenca(): Promise<void> {
  console.log('📥 Fetching presença data from Câmara API...\n')
  
  // Step 1: Fetch deputy list to get names
  console.log('📋 Step 1: Fetching deputy list...')
  const deputies: { id: number; nome: string; partido: string; uf: string }[] = []
  let page = 1
  
  while (page <= 60) {
    const url = `https://dadosabertos.camara.leg.br/api/v2/deputados?pagina=${page}&itens=50&ordem=ASC&ordenarPor=nome`
    const res = await fetch(url)
    if (!res.ok) break
    
    const data = await res.json()
    if (!data.dados || data.dados.length === 0) break
    
    for (const dep of data.dados) {
      deputies.push({
        id: dep.id,
        nome: (dep.ultimoStatus?.nomeEleitoral || dep.ultimoStatus?.nome || dep.nome || '').toUpperCase(),
        partido: dep.ultimoStatus?.siglaPartido || dep.siglaPartido || '',
        uf: dep.ultimoStatus?.siglaUf || dep.siglaUf || ''
      })
    }
    
    if (data.dados.length < 50) break
    page++
  }
  
  console.log(`   Loaded ${deputies.length} deputies`)
  
  // Step 2: Fetch presence data from CSV
  console.log('\n📋 Step 2: Fetching presence records...')
  const presenceById: Record<number, number> = {}
  
  const years = [2024, 2025]
  for (const year of years) {
    console.log(`   Fetching ${year}...`)
    try {
      const url = `https://dadosabertos.camara.leg.br/arquivos/eventosPresencaDeputados/csv/eventosPresencaDeputados-${year}.csv`
      const res = await fetch(url)
      if (!res.ok) {
        console.log(`   Error: ${res.status}`)
        continue
      }
      
      const text = await res.text()
      const lines = text.split('\n')
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const parts = line.replace(/"/g, '').split(';')
        if (parts.length >= 4) {
          const depId = parseInt(parts[3], 10)
          if (!isNaN(depId)) {
            presenceById[depId] = (presenceById[depId] || 0) + 1
          }
        }
      }
    } catch (e) {
      console.log(`   Error:`, e)
    }
  }
  
  console.log(`   ${Object.keys(presenceById).length} deputies with presence records`)
  
  // Step 3: Match with deputy names and create name-based output
  console.log('\n📋 Step 3: Matching with names...')
  
  const presenceByName: Record<string, { presencas: number; sessoes: number; taxa: number }> = {}
  let matched = 0
  
  // Estimate total sessions per year (approximate)
  const sessoesPerYear = 300 // Approximate number of sessions per year
  
  for (const dep of deputies) {
    const presencas = presenceById[dep.id] || 0
    const sessoes = years.length * sessoesPerYear
    const taxa = sessoes > 0 ? Math.round((presencas / sessoes) * 100) : 0
    
    // Create key: NOME|PARTIDO|UF
    const key = `${dep.nome}|${dep.partido}|${dep.uf}`
    presenceByName[key] = { presencas, sessoes, taxa }
    
    if (presencas > 0) matched++
  }
  
  console.log(`   Matched ${matched} deputies with presence data`)
  
  // Step 4: Save outputs
  console.log('\n📋 Step 4: Saving...')
  
  // Save by name key (primary)
  writeFileSync(OUTPUT_BY_NAME, JSON.stringify(presenceByName, null, 2))
  console.log(`   Saved ${Object.keys(presenceByName).length} entries to presenca-by-name.json`)
  
  // Stats
  const values = Object.values(presenceByName)
  const withData = values.filter(v => v.presencas > 0).length
  const avgTaxa = values.reduce((a, b) => a + b.taxa, 0) / values.length
  
  console.log('\n📈 Statistics:')
  console.log(`   Deputies with presence data: ${withData}`)
  console.log(`   Average attendance rate: ${avgTaxa.toFixed(1)}%`)
  
  // Sample
  console.log('\n📊 Sample entries:')
  Object.entries(presenceByName).filter(([, v]) => v.presencas > 0).slice(0, 5).forEach(([key, data]) => {
    console.log(`   ${key}: ${data.taxa}% (${data.presencas}/${data.sessoes})`)
  })
  
  console.log('\n✅ Done!')
}

fetchPresenca().catch(console.error)
