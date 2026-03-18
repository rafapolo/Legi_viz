/**
 * Script to fetch real Pix (transferência especial) data from Transferegov API
 * Run with: npx tsx scripts/fetch-pix-data.ts
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const OUTPUT_FILE = join(process.cwd(), 'public/data/emendas-pix-2025.json')
const EXPENSES_FILE = join(process.cwd(), 'public/data/real-expenses.json')

interface PixData {
  [deputyName: string]: {
    total: number
    count: number
    pix: number
  }
}

async function fetchPixData(year: number = 2025): Promise<PixData> {
  const pixData: PixData = {}
  let offset = 0
  const limit = 100
  let hasMore = true
  
  console.log(`📥 Fetching Pix data for ${year}...`)
  
  while (hasMore) {
    const url = `https://api.transferegov.gestao.gov.br/transferenciasespeciais/plano_acao_especial?ano_plano_acao=eq.${year}&select=nome_parlamentar_emenda_plano_acao,valor_custeio_plano_acao,valor_investimento_plano_acao&offset=${offset}&limit=${limit}`
    
    try {
      const res = await fetch(url, { 
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30000)
      })
      
      if (!res.ok) {
        console.log(`Error fetching: ${res.status}`)
        break
      }
      
      const data = await res.json()
      
      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false
        break
      }
      
      for (const item of data) {
        const name = item.nome_parlamentar_emenda_plano_acao
        if (!name) continue
        
        const value = (item.valor_custeio_plano_acao || 0) + (item.valor_investimento_plano_acao || 0)
        
        if (!pixData[name]) {
          pixData[name] = { total: 0, count: 0, pix: 0 }
        }
        
        pixData[name].total += value
        pixData[name].pix += value
        pixData[name].count += 1
      }
      
      offset += limit
      console.log(`   Fetched ${offset} records...`)
      
      if (data.length < limit) {
        hasMore = false
      }
      
    } catch (e) {
      console.log(`Error:`, e)
      break
    }
  }
  
  return pixData
}

async function main() {
  console.log('🚀 Starting Pix data fetch...\n')
  
  const pixData = await fetchPixData(2025)
  
  console.log(`\n📊 Found ${Object.keys(pixData).length} deputies with Pix data`)
  
  const totalValue = Object.values(pixData).reduce((sum, d) => sum + d.pix, 0)
  console.log(`   Total Pix value: R$ ${(totalValue / 1000000).toFixed(2)}M`)
  
  console.log('\n🔝 Top 10 by Pix value:')
  const sorted = Object.entries(pixData).sort((a, b) => b[1].pix - a[1].pix)
  sorted.slice(0, 10).forEach(([name, data], i) => {
    console.log(`   ${i+1}. ${name}: R$ ${(data.pix / 1000).toFixed(0)}K (${data.count} transfers)`)
  })
  
  console.log('\n💾 Saving to', OUTPUT_FILE)
  writeFileSync(OUTPUT_FILE, JSON.stringify(pixData, null, 2))
  
  console.log('\n✅ Done!')
}

main().catch(console.error)
