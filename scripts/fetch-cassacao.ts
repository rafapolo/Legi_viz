/**
 * Script para buscar dados de cassação de deputados
 * Run with: npx tsx scripts/fetch-cassacao.ts
 */

import { writeFileSync } from 'fs'
import { join } from 'path'
import https from 'https'
import { createWriteStream } from 'fs'
import { createGunzip } from 'zlib'

const OUTPUT_FILE = join(process.cwd(), 'public/data/cassacao-real.json')
const TMP_DIR = join(process.cwd(), '.cassacao-tmp')

async function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        download(response.headers.location!, dest).then(resolve).catch(reject)
        return
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }
      
      response.pipe(createGunzip()).pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

async function parseCSV(content: string): Promise<Record<string, string>[]> {
  const lines = content.split('\n')
  const headers = lines[0].split(';').map(h => h.replace(/"/g, '').trim())
  const rows: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const parts = line.split(';').map(p => p.replace(/"/g, '').trim())
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = parts[idx] || ''
    })
    rows.push(row)
  }
  
  return rows
}

async function main() {
  console.log('📥 Downloading cassação data from TSE...')
  
  const url = 'https://cdn.tse.jus.br/estatistica/sead/odsele/motivo_cassacao/motivo_cassacao_2022.zip'
  const zipPath = join(TMP_DIR, 'cassacao.csv')
  
  try {
    // Simple approach: fetch CSV directly if available
    // Or use the ZIP
    console.log('   Trying direct CSV...')
    
    // Try to find the CSV inside the ZIP
    const { execSync } = await import('child_process')
    
    // Download
    console.log('   Downloading...')
    execSync(`curl -sL "${url}" -o ${TMP_DIR}/cassacao.zip`, { stdio: 'pipe' })
    
    // Extract
    console.log('   Extracting...')
    execSync(`mkdir -p "${TMP_DIR}" && cd "${TMP_DIR}" && powershell -Command "Expand-Archive -Path cassacao.zip -DestinationPath . -Force"`, { stdio: 'pipe' })
    
    // Find CSV
    const csvFiles = execSync(`dir /b "${TMP_DIR}\\*.csv" 2>nul || ls "${TMP_DIR}"/*.csv 2>/dev/null || echo ""`, { encoding: 'utf8' }).trim()
    
    if (!csvFiles) {
      console.log('   No CSV found, checking for alternative...')
      // Try alternative approach
      const allFiles = execSync(`ls "${TMP_DIR}"`, { encoding: 'utf8' })
      console.log('   Files:', allFiles)
    } else {
      const csvPath = join(TMP_DIR, csvFiles.split('\n')[0].trim())
      const content = require('fs').readFileSync(csvPath, 'utf8')
      
      const rows = await parseCSV(content)
      console.log(`   Found ${rows.length} records`)
      
      // Create map by candidate name
      const cassados: Record<string, { motivo: string; tipo: string }> = {}
      
      rows.forEach(row => {
        const nome = (row['NM_CANDIDATO'] || row['Nome_Candidato'] || '').toUpperCase()
        const motivo = row['DS_MOTIVO_CASSACAO'] || row['Motivo'] || ''
        const tipo = row['TP_CASSACAO'] || row['Tipo'] || 'Cassação'
        
        if (nome && motivo) {
          cassados[nome] = { motivo, tipo }
        }
      })
      
      console.log(`\n💾 Found ${Object.keys(cassados).length} politicians with cassação`)
      console.log('\n💾 Saving to', OUTPUT_FILE)
      writeFileSync(OUTPUT_FILE, JSON.stringify(cassados, null, 2))
    }
    
  } catch (e) {
    console.error('Error:', e)
  }
  
  console.log('\n✅ Done!')
}

main().catch(console.error)
