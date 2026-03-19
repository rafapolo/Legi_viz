/**
 * Script to create a name-based presenca lookup for matching with deputies
 * Matches presenca by deputy nomeUrna
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

interface PresencaData {
  presencas: number
  sessoes: number
  taxa: number
}

interface PresencaByName {
  [nome: string]: PresencaData
}

async function main() {
  console.log('🔧 Creating name-based presenca lookup...\n')

  const DATA_DIR = join(process.cwd(), 'public/data')
  const TEMP_DIR = join(process.cwd(), 'public/data/temp')

  // Step 1: Build SQ -> Nome mapping from TSE candidate files
  console.log('📋 Step 1: Building SQ -> Nome mapping...')
  
  const sqToNome: Record<string, string> = {}
  
  const files = require('fs').readdirSync(TEMP_DIR)
    .filter((f: string) => f.startsWith('consulta_cand_2022_') && f.endsWith('.csv'))
  
  for (const file of files) {
    const content = readFileSync(join(TEMP_DIR, file), 'latin1')
    const lines = content.split('\n').filter((l: string) => l.trim())
    
    if (lines.length < 2) continue
    
    const header = lines[0].split(';').map((h: string) => h.replace(/"/g, ''))
    const sqCol = header.findIndex((h: string) => h.includes('SQ_CANDIDATO'))
    const nomeCol = header.findIndex((h: string) => h.includes('NM_CANDIDATO') || h.includes('NM_URNA'))
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map((c: string) => c.replace(/"/g, ''))
      const sq = cols[sqCol] || ''
      const nome = cols[nomeCol]?.toUpperCase() || ''
      if (sq && nome) sqToNome[sq] = nome
    }
  }
  
  console.log(`   Built ${Object.keys(sqToNome).length} SQ -> Nome mappings`)
  
  // Step 2: Load existing presenca data (by SQ ID)
  console.log('\n📋 Step 2: Loading presenca data...')
  
  const presencaPath = join(DATA_DIR, 'presenca-real.json')
  const presencaById: Record<string, PresencaData> = JSON.parse(readFileSync(presencaPath, 'utf8'))
  console.log(`   Loaded ${Object.keys(presencaById).length} entries by ID`)
  
  // Step 3: Try to find the original data source
  // The SQ IDs in presenca (5-digit) don't match current TSE IDs (14-digit)
  // These are legacy TSE IDs from a different era
  
  // Check if there's another source file
  const allFiles = require('fs').readdirSync(DATA_DIR)
  const dataFiles = allFiles.filter((f: string) => f.includes('presenc') || f.includes('presenca'))
  console.log('\n📋 Step 3: Available presenca files:', dataFiles)
  
  // Step 4: Create a name-based lookup from tse-dados.json
  console.log('\n📋 Step 4: Creating lookup from tse-dados.json...')
  
  const tsePath = join(DATA_DIR, 'tse-dados.json')
  if (!existsSync(tsePath)) {
    console.log('   ERROR: tse-dados.json not found!')
    return
  }
  
  const tseData: Record<string, any> = JSON.parse(readFileSync(tsePath, 'utf8'))
  
  // The tse-dados.json has keys like "NAME|PARTIDO|UF"
  // We need to extract just the name for matching
  const nameToPatrimonio: Record<string, { partido: string; uf: string; patrimonio: number }> = {}
  
  for (const [key, data] of Object.entries(tseData)) {
    const parts = key.split('|')
    if (parts.length >= 3) {
      const nome = parts[0]
      nameToPatrimonio[nome] = data
    }
  }
  
  console.log(`   Loaded ${Object.keys(nameToPatrimonio).length} name -> data entries`)
  
  // Step 5: Since we can't match by ID, let's check if we can fetch fresh data
  // For now, create a lookup that will work when we have a proper data source
  
  // Create a placeholder that indicates "data needs refreshing"
  const presencaLookup: PresencaByName = {}
  
  // Check what percentage of TSE names might match the presenca data
  // by checking if there are any direct overlaps
  
  console.log('\n📊 Summary:')
  console.log('   Presenca data has 623 entries by legacy TSE IDs (5-digit)')
  console.log('   Current candidate data has 14-digit TSE IDs')
  console.log('   Cannot directly match without a cross-reference table')
  console.log('')
  console.log('   Options to fix:')
  console.log('   1. Fetch presenca data from Chamber API using proper deputy IDs')
  console.log('   2. Find original source with name-linked presenca data')
  console.log('   3. Manually create cross-reference between legacy and current IDs')
  
  // For now, let's just note this limitation
  // The presenca will show as 0% for all deputies until this is fixed
  console.log('\n⚠️  Presenca data cannot be matched with current deputy list')
  console.log('   Will need to re-fetch presenca data using Chamber API deputy IDs')
}

main().catch(console.error)
