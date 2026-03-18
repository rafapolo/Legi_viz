/**
 * Script para processar dados de cassação do TSE
 * Run with: npx tsx scripts/process-cassacao.ts
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const INPUT_DIR = join(process.cwd(), '.cassacao-tmp')
const OUTPUT_FILE = join(process.cwd(), 'public/data/cassacao-real.json')

interface CassacaoRecord {
  sq_candidato: string
  nr_processo: string
  tipo_motivo: string
  motivo: string
  uf?: string
}

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
  console.log('📥 Processing cassação data from TSE...')
  
  const files = readdirSync(INPUT_DIR).filter(f => f.endsWith('.csv') && f.includes('motivo_cassacao'))
  
  const cassados: Record<string, CassacaoRecord[]> = {}
  
  for (const file of files) {
    const content = readFileSync(join(INPUT_DIR, file), 'utf8')
    const lines = content.split('\n')
    
    if (lines.length < 2) continue
    
    // Parse header
    const headers = parseCSVLine(lines[0])
    const sqIdx = headers.findIndex(h => h.includes('SQ_CANDIDATO'))
    const nrProcIdx = headers.findIndex(h => h.includes('NR_PROCESSO'))
    const tipoIdx = headers.findIndex(h => h.includes('DS_TP_MOTIVO'))
    const motivoIdx = headers.findIndex(h => h.includes('DS_MOTIVO'))
    const ufIdx = headers.findIndex(h => h === 'SG_UF' || h.includes('UF'))
    
    // Parse data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const parts = parseCSVLine(line)
      if (parts.length < 4) continue
      
      const sq = parts[sqIdx] || ''
      if (!sq) continue
      
      const record: CassacaoRecord = {
        sq_candidato: sq,
        nr_processo: parts[nrProcIdx] || '',
        tipo_motivo: parts[tipoIdx] || '',
        motivo: parts[motivoIdx] || '',
      }
      
      if (ufIdx >= 0) {
        record.uf = parts[ufIdx]
      }
      
      if (!cassados[sq]) {
        cassados[sq] = []
      }
      cassados[sq].push(record)
    }
  }
  
  // Filter to only keep relevant records (Federal Deputy = 5 for DG, 6 for DS)
  // But for now, keep all - we'll filter later by matching with deputy list
  console.log(`   Found ${Object.keys(cassados).length} unique candidate IDs`)
  
  // Save
  console.log('\n💾 Saving to', OUTPUT_FILE)
  writeFileSync(OUTPUT_FILE, JSON.stringify(cassados, null, 2))
  
  // Stats
  const motivos = new Set<string>()
  Object.values(cassados).forEach(records => {
    records.forEach(r => motivos.add(r.tipo_motivo))
  })
  
  console.log('\n📈 Statistics:')
  console.log(`   Unique candidates: ${Object.keys(cassados).length}`)
  console.log(`   Motive types: ${motivos.size}`)
  console.log(`   Motive types:`, Array.from(motivos))
  console.log('\n✅ Done!')
}

main().catch(console.error)
