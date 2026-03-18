/**
 * Script para buscar mandatos reais dos deputados via CSV
 * Run with: npx tsx scripts/fetch-mandatos.ts
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

const OUTPUT_FILE = join(process.cwd(), 'public/data/mandatos-real.json')

async function main() {
  console.log('📥 Downloading deputies CSV...')
  
  const res = await fetch('https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv')
  if (!res.ok) {
    console.error('Error downloading:', res.status)
    return
  }
  
  const text = await res.text()
  const lines = text.split('\n')
  
  console.log(`   Total lines: ${lines.length}`)
  
  // Parse CSV
  const mandatos: Record<number, number> = {}
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // CSV uses ; as separator
    const parts = line.replace(/"/g, '').split(';')
    if (parts.length >= 4) {
      // Extract ID from uri
      const uriMatch = parts[0].match(/\/(\d+)$/)
      if (uriMatch) {
        const id = parseInt(uriMatch[1], 10)
        const inicial = parseInt(parts[2], 10) || 57
        const final = parseInt(parts[3], 10) || 57
        
        // Calculate number of mandates (legislatures)
        const numMandatos = Math.max(1, final - inicial + 1)
        
        // Only keep current deputies (legislatura 57 = 2023-2027)
        if (final >= 57) {
          mandatos[id] = numMandatos
        }
      }
    }
  }
  
  console.log(`   Found ${Object.keys(mandatos).length} deputies with mandate data`)
  
  // Calculate stats
  const values = Object.values(mandatos)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const max = Math.max(...values)
  const min = Math.min(...values)
  
  console.log(`\n📈 Statistics:`)
  console.log(`   Average mandates: ${avg.toFixed(1)}`)
  console.log(`   Min: ${min}, Max: ${max}`)
  console.log(`   1 mandato: ${values.filter(v => v === 1).length}`)
  console.log(`   2 mandatos: ${values.filter(v => v === 2).length}`)
  console.log(`   3+ mandatos: ${values.filter(v => v >= 3).length}`)
  
  console.log('\n💾 Saving to', OUTPUT_FILE)
  writeFileSync(OUTPUT_FILE, JSON.stringify(mandatos, null, 2))
  console.log('\n✅ Done!')
}

main().catch(console.error)
