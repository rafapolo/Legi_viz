/**
 * Script para extrair CPFs dos candidatos eleitos do TSE 2022
 */

import { createWriteStream } from 'fs'
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

const OUTPUT_DIR = join(process.cwd(), 'public/data')
const TSE_ZIP_URL = 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip'
const TEMP_ZIP = join(process.cwd(), 'temp_tse_2022.zip')

const raceMap: Record<string, string> = {
  'BRANCA': 'Branco',
  'PRETA': 'Preto',
  'PARDA': 'Pardo',
  'AMARELA': 'Amarelo',
  'INDÍGENA': 'Indigena',
  'INDIGENA': 'Indigena',
  'NÃO DECLARADA': 'Branco',
}

async function downloadZip(): Promise<void> {
  console.log('Downloading TSE 2022 ZIP...')
  const response = await fetch(TSE_ZIP_URL)
  if (!response.ok) {
    console.error('Download failed:', response.status)
    return
  }
  const stream = createWriteStream(TEMP_ZIP)
  await pipeline(Readable.fromWeb(response.body as any), stream)
  console.log('Downloaded')
}

async function extract(): Promise<void> {
  console.log('Reading ZIP...')
  
  const AdmZip = require('adm-zip')
  const zip = new AdmZip(TEMP_ZIP)
  const entries = zip.getEntries()
  
  const byCPF: Record<string, { nome: string; raca: string; genero: string }> = {}
  
  const stateEntries = entries.filter((e: any) => 
    !e.isDirectory && 
    e.entryName.endsWith('.csv') && 
    e.entryName.includes('consulta_cand_2022_') &&
    e.entryName.length > 20 &&  // Exclude BRASIL file
    !e.entryName.includes('leiame')
  )
  
  console.log(`Processing ${stateEntries.length} state files...`)
  
  for (const entry of stateEntries) {
    const content = entry.getData().toString('utf8')
    const lines = content.split('\n').filter((l: string) => l.trim())
    
    if (lines.length < 2) continue
    
    const header = lines[0].split(';').map((h: string) => h.replace(/"/g, ''))
    
    // Column indexes for 2022 (based on debug output)
    // Using fixed indexes instead of header search due to encoding issues
    const cpfIdx = 20  // NR_CPF_CANDIDATO
    const nomeIdx = 17 // NM_CANDIDATO
    const urnaIdx = 18 // NM_URNA_CANDIDATO
    const raceIdx = 45 // DS_COR_RACA
    const genderIdx = 39 // DS_GENERO
    const cargoCdIdx = 13 // CD_CARGO
    const sitIdx = 49 // DS_SIT_TOT_TURNO
    
    console.log('  Using fixed indexes:', { cpfIdx, nomeIdx, urnaIdx, raceIdx, genderIdx, cargoCdIdx, sitIdx })
    
    if (cpfIdx === -1 || cargoCdIdx === -1) {
      console.log(`  ${entry.entryName}: No CPF or CARGO column`)
      continue
    }
    
    let count = 0
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map((c: string) => c.replace(/"/g, '').trim())
      
      const cpf = cols[cpfIdx]
      const name = cols[nomeIdx]
      const urna = urnaIdx >= 0 ? cols[urnaIdx] : name
      const race = raceIdx >= 0 ? cols[raceIdx] : ''
      const gender = genderIdx >= 0 ? cols[genderIdx] : ''
      const cargoCd = cols[cargoCdIdx]
      const situacao = sitIdx >= 0 ? cols[sitIdx] : ''
      
      if (!cpf || cpf.length < 10) continue
      
      // CD_CARGO: 6 = Federal Deputy, 5 = Senator
      if (cargoCd !== '6' && cargoCd !== '5') continue
      
      // Only elected (not "NÃO ELEITO")
      if (!situacao || !situacao.startsWith('ELEITO')) continue
      
      if (!byCPF[cpf]) {
        byCPF[cpf] = {
          nome: urna || name,
          raca: raceMap[race] || race,
          genero: gender === 'FEMININO' ? 'Mulher' : 'Homem'
        }
        count++
      }
    }
    console.log(`  ${entry.entryName}: ${count} elected (federal+senate)`)
  }
  
  console.log(`\nTotal: ${Object.keys(byCPF).length} elected with CPF`)
  
  // Race distribution
  const raceCount: Record<string, number> = {}
  for (const entry of Object.values(byCPF)) {
    raceCount[entry.raca] = (raceCount[entry.raca] || 0) + 1
  }
  console.log('Race distribution:', raceCount)
  
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }
  
  // Save by CPF
  writeFileSync(join(OUTPUT_DIR, 'tse-deputados-cpf-2022.json'), JSON.stringify(byCPF, null, 2))
  
  // Also save by name for matching
  const byName: Record<string, { raca: string; genero: string }> = {}
  for (const entry of Object.values(byCPF)) {
    const normalized = entry.nome.toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z ]/g, '')
      .trim()
    byName[normalized] = { raca: entry.raca, genero: entry.genero }
  }
  writeFileSync(join(OUTPUT_DIR, 'tse-deputados-2022.json'), JSON.stringify(byName, null, 2))
  
  console.log('Saved!')
  // Keep temp file for debugging
  // unlinkSync(TEMP_ZIP)
}

async function main() {
  await downloadZip()
  await extract()
}

main().catch(console.error)
