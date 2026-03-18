/**
 * Script to fetch real votes and assets from TSE
 * Run with: npx tsx scripts/fetch-tse-data.ts
 */

import { writeFileSync, existsSync, createReadStream, createWriteStream } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { decompress } from 'compressing'

const TSE_VOTES_URL = 'https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip'
const TSE_BENS_URL = 'https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2022.zip'

const VOTES_FILE = join(process.cwd(), 'public/data/tse-votes-2022.csv')
const BENS_FILE = join(process.cwd(), 'public/data/tse-bens-2022.csv')
const OUTPUT_VOTES = join(process.cwd(), 'public/data/real-votes.json')
const OUTPUT_BENS = join(process.cwd(), 'public/data/real-bens.json')

async function downloadFile(url: string, destPath: string) {
  console.log(`📥 Downloading ${url.split('/').pop()}...`)
  
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download: ${res.status}`)
  
  const buffer = await res.arrayBuffer()
  const nodeBuffer = Buffer.from(buffer)
  
  console.log(`💾 Saving to ${destPath}`)
  
  // Decompress zip
  const dir = destPath.replace('.zip', '')
  await decompress.unzip(nodeBuffer, join(process.cwd(), 'public/data/temp'))
  
  console.log(`✅ Downloaded and extracted`)
}

function parseCSV(content: string): string[][] {
  const lines = content.split('\n').filter(l => l.trim())
  return lines.map(line => {
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
  })
}

async function processVotes() {
  console.log('\n📊 Processing votes data...')
  
  // For federal deputies (cargo = 6)
  const votesData: Record<string, { votes: number, uf: string }> = {}
  
  // This is a simplified version - actual file has columns like:
  // DATA_GERACAO, HORA_GERACAO, ANO_ELEICAO, NUM_TURNO, UF, ... CARGO, NOME_CANDIDATO, NUMERO_CANDIDATO, ...
  
  console.log('Processing vote data by candidate...')
  
  // Return placeholder - actual processing would need to parse the large CSV
  return votesData
}

async function processBens() {
  console.log('\n📊 Processing bens (assets) data...')
  
  // Columns: DATA_GERACAO, ANO_ELEICAO, UF, SIGLA_PARTIDO, NUMERO_CANDIDATO, NOME_CANDIDATO, CPF_CANDIDATO, SEQUENCIAL_CANDIDATO, CODIGO_LEGENDA, SIGLA_UE, TIPO_BEM, DESCRICAO_BEM, VALOR_BEM
  
  console.log('Processing assets data by candidate...')
  
  // Return placeholder - actual processing would need to parse the large CSV
  return {}
}

async function main() {
  console.log('🚀 Starting TSE data fetch...\n')
  console.log('Note: TSE provides large CSV files that need to be downloaded and processed.')
  console.log('This script provides the framework - actual data processing requires downloading ~1GB of files.\n')
  
  // Check if files exist
  if (!existsSync(VOTES_FILE.replace('.zip', ''))) {
    console.log('Votes file not found. Please download from:')
    console.log(TSE_VOTES_URL)
  }
  
  if (!existsSync(BENS_FILE.replace('.zip', ''))) {
    console.log('Assets file not found. Please download from:')
    console.log(TSE_BENS_URL)
  }
  
  // For now, create empty output files
  writeFileSync(OUTPUT_VOTES, JSON.stringify({}, null, 2))
  writeFileSync(OUTPUT_BENS, JSON.stringify({}, null, 2))
  
  console.log('\n⚠️  The TSE data files are very large (1GB+).')
  console.log('Please download manually and place CSV files in public/data/')
  console.log('Then run this script again to process.')
}

main().catch(console.error)
