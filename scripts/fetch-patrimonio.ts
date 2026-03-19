/**
 * Script to process TSE patrimony data and match with CPF
 * Run with: npx tsx scripts/fetch-patrimonio.ts
 */

import { writeFileSync, existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const OUTPUT_DIR = join(process.cwd(), 'public/data')
const TEMP_DIR = join(process.cwd(), 'public/data/temp')

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

async function main() {
  console.log('🚀 Processing TSE Patrimony Data\n')
  
  // Step 1: Load candidate list to get SQ_CANDIDATO -> CPF mapping
  console.log('📋 Step 1: Loading candidate list...')
  
  const sqToCpf: Record<string, string> = {}
  const sqToInfo: Record<string, { nome: string; partido: string; uf: string }> = {}
  
  const candFiles = readdirSync(TEMP_DIR)
    .filter(f => f.startsWith('consulta_cand_2022_') && f.endsWith('.csv'))
  
  console.log(`   Found ${candFiles.length} candidate files`)
  
  let cpfCol = -1
  let sqCol = -1
  let nomeCol = -1
  let partidoCol = -1
  let ufCol = -1
  
  for (const file of candFiles) {
    const content = readFileSync(join(TEMP_DIR, file), 'latin1')
    const lines = content.split('\n').filter(l => l.trim())
    
    if (lines.length < 2) continue
    
    const header = parseCSVLine(lines[0])
    
    // Find columns on first file
    if (cpfCol === -1) {
      cpfCol = header.findIndex(h => h.includes('CPF'))
      sqCol = header.findIndex(h => h.includes('SQ_CANDIDATO'))
      nomeCol = header.findIndex(h => h.includes('NM_CANDIDATO') || h.includes('NM_URNA'))
      partidoCol = header.findIndex(h => h.includes('SG_PARTIDO'))
      ufCol = header.findIndex(h => h.includes('SG_UF'))
      
      console.log(`   Columns: CPF=${cpfCol}, SQ=${sqCol}, NOME=${nomeCol}, PARTIDO=${partidoCol}, UF=${ufCol}`)
    }
    
    const uf = file.replace('consulta_cand_2022_', '').replace('.csv', '')
    
    // Process only federal deputies (cargo = 6) or senators
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      
      if (values.length < Math.max(cpfCol, sqCol, nomeCol, partidoCol) + 1) continue
      
      const sq = sqCol >= 0 ? values[sqCol] : ''
      const cpf = cpfCol >= 0 ? values[cpfCol].replace(/\D/g, '') : ''
      const nome = nomeCol >= 0 ? values[nomeCol] : ''
      const partido = partidoCol >= 0 ? values[partidoCol] : ''
      
      if (!sq) continue
      
      sqToCpf[sq] = cpf
      sqToInfo[sq] = { nome: nome.toUpperCase(), partido, uf }
    }
  }
  
  console.log(`   Loaded ${Object.keys(sqToCpf).length} candidate mappings`)
  
  // Step 2: Load patrimony data and match with CPF
  console.log('\n📋 Step 2: Loading patrimony data...')
  
  const patrimonyByCpf: Record<string, { patrimonio: number; nome: string; partido: string; uf: string }> = {}
  
  const bemFiles = readdirSync(TEMP_DIR)
    .filter(f => f.startsWith('bem_candidato_2022_') && f.endsWith('.csv'))
    .filter(f => !f.includes('_BRASIL') && !f.includes('_BR.'))
  
  console.log(`   Found ${bemFiles.length} patrimony files`)
  
  let vrCol = -1
  let sqBemCol = -1
  let descCol = -1
  let tipoCol = -1
  
  let totalRecords = 0
  
  for (const file of bemFiles) {
    const content = readFileSync(join(TEMP_DIR, file), 'latin1')
    const lines = content.split('\n').filter(l => l.trim())
    
    if (lines.length < 2) continue
    
    const header = parseCSVLine(lines[0])
    
    if (vrCol === -1) {
      vrCol = header.findIndex(h => h.includes('VR_BEM'))
      sqBemCol = header.findIndex(h => h.includes('SQ_CANDIDATO'))
      descCol = header.findIndex(h => h.includes('DS_BEM'))
      tipoCol = header.findIndex(h => h.includes('DS_TIPO'))
      
      console.log(`   Columns: VR_BEM=${vrCol}, SQ=${sqBemCol}`)
    }
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      
      if (values.length < Math.max(vrCol, sqBemCol) + 1) continue
      
      const sq = sqBemCol >= 0 ? values[sqBemCol] : ''
      const vrStr = vrCol >= 0 ? values[vrCol] : '0'
      
      if (!sq) continue
      
      let vr = 0
      try {
        vr = parseFloat(vrStr.replace(',', '.').replace(/[^\d.-]/g, ''))
        if (isNaN(vr)) vr = 0
      } catch {}
      
      const cpf = sqToCpf[sq] || ''
      const info = sqToInfo[sq] || { nome: '', partido: '', uf: '' }
      
      if (!cpf) continue // Skip if no CPF match
      
      if (!patrimonyByCpf[cpf]) {
        patrimonyByCpf[cpf] = {
          patrimonio: 0,
          nome: info.nome,
          partido: info.partido,
          uf: info.uf
        }
      }
      patrimonyByCpf[cpf].patrimonio += vr
      totalRecords++
    }
  }
  
  console.log(`   Processed ${totalRecords.toLocaleString()} patrimony records`)
  console.log(`   Found ${Object.keys(patrimonyByCpf).length.toLocaleString()} candidates with CPF`)
  
  // Statistics
  const byState: Record<string, number> = {}
  const byParty: Record<string, number> = {}
  let withPatrimony = 0
  let totalPatrimony = 0
  
  for (const [, data] of Object.entries(patrimonyByCpf)) {
    byState[data.uf] = (byState[data.uf] || 0) + 1
    byParty[data.partido] = (byParty[data.partido] || 0) + 1
    if (data.patrimonio > 0) withPatrimony++
    totalPatrimony += data.patrimonio
  }
  
  console.log(`\n📊 Statistics:`)
  console.log(`   Candidates: ${Object.keys(patrimonyByCpf).length.toLocaleString()}`)
  console.log(`   With patrimony > 0: ${withPatrimony.toLocaleString()}`)
  console.log(`   States covered: ${Object.keys(byState).length}`)
  console.log(`   Total patrimony: R$ ${totalPatrimony.toLocaleString('pt-BR')}`)
  
  console.log(`\n   By state:`)
  Object.entries(byState).sort((a, b) => b[1] - a[1]).forEach(([uf, count]) => {
    console.log(`     ${uf}: ${count.toLocaleString()}`)
  })
  
  console.log(`\n   Top 10 parties:`)
  Object.entries(byParty).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([party, count]) => {
    console.log(`     ${party}: ${count.toLocaleString()}`)
  })
  
  // Save raw data
  const OUTPUT_FILE = join(OUTPUT_DIR, 'tse-patrimonio.json')
  console.log(`\n💾 Saving to ${OUTPUT_FILE}...`)
  writeFileSync(OUTPUT_FILE, JSON.stringify(patrimonyByCpf, null, 2))
  
  // Create merged version with existing tse-dados.json
  console.log('\n🔗 Creating merged TSE data file...')
  
  const tsePath = join(OUTPUT_DIR, 'tse-dados.json')
  const merged: Record<string, any> = {}
  
  // Copy existing data first
  if (existsSync(tsePath)) {
    const existing = JSON.parse(readFileSync(tsePath, 'utf8'))
    for (const [key, value] of Object.entries(existing)) {
      merged[key] = value
    }
    console.log(`   Copied ${Object.keys(existing).length} existing entries`)
  }
  
  // Add new patrimony data by nome+partido+uf key
  let addedCount = 0
  let updatedCount = 0
  
  for (const [, data] of Object.entries(patrimonyByCpf)) {
    const d = data as any
    
    // Skip if patrimony is 0
    if (d.patrimonio <= 0) continue
    
    const key = `${d.nome}|${d.partido}|${d.uf}`
    
    if (!merged[key]) {
      merged[key] = {
        patrimonio: d.patrimonio, // Store raw value in R$
        partido: d.partido,
        uf: d.uf
      }
      addedCount++
    } else {
      // Update existing entry with patrimony (sum if different)
      merged[key].patrimonio = Math.max(merged[key].patrimonio, d.patrimonio)
      updatedCount++
    }
  }
  
  const mergedPath = join(OUTPUT_DIR, 'tse-dados-complete.json')
  writeFileSync(mergedPath, JSON.stringify(merged, null, 2))
  
  console.log(`   Added ${addedCount} new entries`)
  console.log(`   Updated ${updatedCount} existing entries`)
  console.log(`   Total: ${Object.keys(merged).length} entries`)
  
  // Count how many have patrimony > 0
  const withPatrimonyCount = Object.values(merged).filter((e: any) => e.patrimonio > 0).length
  console.log(`\n   Entries with patrimony > 0: ${withPatrimonyCount}`)
  
  console.log('\n✅ Complete!')
  console.log(`\n   Files created:`)
  console.log(`   - ${OUTPUT_FILE} (${Object.keys(patrimonyByCpf).length} candidates by CPF)`)
  console.log(`   - ${mergedPath} (${Object.keys(merged).length} entries merged)`)
  
  // Replace the old tse-dados.json with the new complete one
  console.log('\n🔄 Replacing tse-dados.json with complete version...')
  writeFileSync(tsePath, JSON.stringify(merged, null, 2))
  console.log('✅ Done!')
}

main().catch(console.error)
