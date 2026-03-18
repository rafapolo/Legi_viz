/**
 * Script para buscar dados de presença dos deputados
 * Run with: npx tsx scripts/fetch-presenca.ts
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

const OUTPUT_FILE = join(process.cwd(), 'public/data/presenca-real.json')

async function fetchPresenca(): Promise<void> {
  console.log('📥 Fetching presença data from Câmara API...')
  
  // Files: eventosPresencaDeputados-2024.csv
  const years = [2024, 2025]
  const presenceByDep: Record<number, { presencas: number; sessoes: number }> = {}
  
  for (const year of years) {
    console.log(`   Fetching ${year}...`)
    try {
      const url = `https://dadosabertos.camara.leg.br/arquivos/eventosPresencaDeputados/csv/eventosPresencaDeputados-${year}.csv`
      const res = await fetch(url)
      if (!res.ok) {
        console.log(`   Error fetching ${year}: ${res.status}`)
        continue
      }
      
      const text = await res.text()
      const lines = text.split('\n')
      
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        // CSV uses ; as separator
        // Format: "idEvento";"uriEvento";"dataHoraInicio";"idDeputado";"uriDeputado"
        const parts = line.replace(/"/g, '').split(';')
        if (parts.length >= 4) {
          const depId = parseInt(parts[3], 10)
          if (!isNaN(depId)) {
            if (!presenceByDep[depId]) {
              presenceByDep[depId] = { presencas: 0, sessoes: 0 }
            }
            presenceByDep[depId].presencas++
          }
        }
      }
      
      console.log(`   ${year}: ${Object.keys(presenceByDep).length} unique deputies`)
    } catch (e) {
      console.log(`   Error ${year}:`, e)
    }
  }
  
  // Also get total sessions per year for comparison
  for (const year of years) {
    try {
      // Get event count
      const url = `https://dadosabertos.camara.leg.br/api/v2/eventos?dataInicio=${year}-01-01&dataFim=${year}-12-31&itens=1`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (res.ok) {
        const j = await res.json()
        const links = j.links ?? []
        const lastLink = links.find((l: any) => l.rel === 'last')
        if (lastLink) {
          const match = lastLink.href.match(/pagina=(\d+)/)
          const totalPages = match ? parseInt(match[1], 10) : 1
          const eventsPerPage = 1
          // This is approximate - each page returns 1 item
          const totalEvents = totalPages * eventsPerPage
          
          // Update sessoes count
          for (const depId of Object.keys(presenceByDep)) {
            if (!presenceByDep[parseInt(depId)].sessoes) {
              presenceByDep[parseInt(depId)].sessoes = 0
            }
            presenceByDep[parseInt(depId)].sessoes += totalPages
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
  
  // Calculate attendance rate
  const output: Record<number, { presencas: number; sessoes: number; taxa: number }> = {}
  for (const [id, data] of Object.entries(presenceByDep)) {
    const depId = parseInt(id)
    const taxa = data.sessoes > 0 ? Math.round((data.presencas / data.sessoes) * 100) : 0
    output[depId] = {
      presencas: data.presencas,
      sessoes: data.sessoes,
      taxa: Math.min(taxa, 100)
    }
  }
  
  console.log('\n💾 Saving to', OUTPUT_FILE)
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))
  
  // Stats
  const values = Object.values(output)
  const withData = values.filter(v => v.presencas > 0).length
  const avgTaxa = values.reduce((a, b) => a + b.taxa, 0) / values.length
  
  console.log('\n📈 Statistics:')
  console.log(`   Deputies with presence data: ${withData}`)
  console.log(`   Average attendance rate: ${avgTaxa.toFixed(1)}%`)
  console.log('✅ Done!')
}

fetchPresenca().catch(console.error)
