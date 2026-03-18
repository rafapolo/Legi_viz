/**
 * Script para criar mapa de processos por nome de parlamentar
 * Run with: npx tsx scripts/process-processos.ts
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const TSE_DIR = join(process.cwd(), '.tse-tmp')
const CASSACAO_FILE = join(process.cwd(), 'public/data/cassacao-real.json')
const OUTPUT_FILE = join(process.cwd(), 'public/data/processos-real.json')

function normalizeName(name: string): string {
  if (!name) return ''
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
  console.log('📥 Loading cassação data...')
  const cassacao = JSON.parse(readFileSync(CASSACAO_FILE, 'utf8'))
  console.log(`   Cassacao entries: ${Object.keys(cassacao).length}`)
  
  console.log('📥 Processing candidate CSVs...')
  
  // Create a map of SQ_CANDIDATO to normalized names
  const sqToNames: Record<string, Set<string>> = {}
  
  const files = readdirSync(TSE_DIR).filter(f => f.endsWith('.csv') && f.includes('consulta_cand'))
  
  for (const file of files) {
    console.log(`   Processing ${file}...`)
    const content = readFileSync(join(TSE_DIR, file), 'utf8')
    const lines = content.split('\n')
    
    if (lines.length < 2) continue
    
    // Parse header
    const headers = parseCSVLine(lines[0])
    const sqIdx = headers.findIndex(h => h === 'SQ_CANDIDATO')
    const nomeIdx = headers.findIndex(h => h === 'NM_CANDIDATO')
    const urnaIdx = headers.findIndex(h => h === 'NM_URNA_CANDIDATO')
    const cargoIdx = headers.findIndex(h => h === 'DS_CARGO')
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const parts = parseCSVLine(line)
      const sq = parts[sqIdx]
      const nome = parts[nomeIdx]
      const urna = parts[urnaIdx]
      const cargo = parts[cargoIdx]
      
      if (!sq) continue
      
      // Only care about Deputado Federal (CD_CARGO = 5 or 6 for state)
      // But for now, include all
      
      if (!sqToNames[sq]) {
        sqToNames[sq] = new Set()
      }
      
      if (nome) sqToNames[sq].add(normalizeName(nome))
      if (urna && urna !== nome) sqToNames[sq].add(normalizeName(urna))
    }
  }
  
  console.log(`   Mapped ${Object.keys(sqToNames).length} SQ_CANDIDATOs to names`)
  
  // Now match cassacao with candidate names
  const processosPorNome: Record<string, { count: number; motivos: string[] }> = {}
  
  for (const [sq, names] of Object.entries(sqToNames)) {
    const cassacaoRecords = cassacao[sq] as Array<{sq_candidato: string; nr_processo: string; tipo_motivo: string; motivo: string; uf?: string}> | undefined
    if (cassacaoRecords && cassacaoRecords.length > 0) {
      const motivos = [...new Set(cassacaoRecords.map((r: {motivo: string}) => r.motivo))]
      for (const nome of names) {
        if (!processosPorNome[nome]) {
          processosPorNome[nome] = { count: 0, motivos: [] }
        }
        processosPorNome[nome].count += cassacaoRecords.length
        processosPorNome[nome].motivos.push(...motivos)
      }
    }
  }
  
  // Deduplicate motivos
  for (const nome of Object.keys(processosPorNome)) {
    processosPorNome[nome].motivos = [...new Set(processosPorNome[nome].motivos)]
  }
  
  console.log(`   Matched ${Object.keys(processosPorNome).length} names with processes`)
  
  console.log('\n💾 Saving to', OUTPUT_FILE)
  writeFileSync(OUTPUT_FILE, JSON.stringify(processosPorNome, null, 2))
  
  // Stats
  const withProcessos = Object.values(processosPorNome).filter(p => p.count > 0).length
  
  console.log('\n📈 Statistics:')
  console.log(`   Total names with process data: ${withProcessos}`)
  console.log('\n✅ Done!')
}

main().catch(console.error)
