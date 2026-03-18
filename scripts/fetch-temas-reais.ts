/**
 * Script simple para buscar temas baseado em proposições
 * Run with: npx tsx scripts/fetch-temas-reais.ts
 */

import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

const OUTPUT_FILE = join(process.cwd(), 'public/data/temas-reais.json')

// Simple keyword matching
const TEMA_KEYWORDS: Record<string, string[]> = {
  'Saude': ['saude', 'saúde', 'hospital', 'medico', 'enfermagem', 'vacina', 'sus', 'clinica', 'clinica', 'tratamento'],
  'Seguranca': ['seguranca', 'segurança', 'policia', 'crime', 'violencia', 'arma', 'homicidio', 'estupro'],
  'Agro': ['agro', 'agricultura', 'rural', 'fazenda', 'pecuaria', 'cafe', 'soja', 'milho', 'indigena'],
  'Educacao': ['educacao', 'educação', 'ensino', 'escola', 'universidade', 'professor', 'aluno', 'pesquisa'],
  'Economia': ['economia', 'fiscal', 'tributo', 'imposto', 'investimento', 'trabalho', 'emprego', 'salario'],
  'Meio Ambiente': ['ambiente', 'ambiental', 'ecologia', 'clima', 'energia', 'reciclagem', 'ibama'],
  'Infraestrutura': ['infraestrutura', 'transporte', 'estrada', 'metro', 'ferrovia', 'construcao', 'habitacao'],
  'Direitos': ['direito', 'direitos', 'humano', 'constituicao', 'justica', 'mulher', 'crianca', 'social'],
}

function normalizeText(text: string): string {
  if (!text) return ''
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
}

function getTemaFromText(text: string): string[] {
  const normalized = normalizeText(text)
  const temas: string[] = []
  
  for (const [tema, keywords] of Object.entries(TEMA_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        temas.push(tema)
        break
      }
    }
  }
  
  return temas
}

// Try to get themes from the existing projetos data
async function main() {
  console.log('📥 Loading existing data...')
  
  // Try to fetch deputies with theme data from API
  const temasData: Record<number, { nome: string; temas: number[]; scores: number[] }> = {}
  
  // Get deputy IDs that we know work (from previous legislature)
  const knownWorkingIds = [
    73701, 73801, 74090, 74156, 1605, 141431, 74675, 73922, 204379, 220593
  ]
  
  console.log('📊 Fetching propositions with known working IDs...')
  
  for (const id of knownWorkingIds) {
    try {
      const url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?idDeputadoAutor=${id}&itens=30`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) continue
      
      const j = await res.json()
      const dados = j.dados ?? []
      if (dados.length === 0) continue
      
      const temas: Record<string, number> = {
        'Saude': 0, 'Seguranca': 0, 'Agro': 0, 'Educacao': 0,
        'Economia': 0, 'Meio Ambiente': 0, 'Infraestrutura': 0, 'Direitos': 0,
      }
      
      let nome = ''
      
      for (const prop of dados) {
        if (!nome && prop.ultimoStatus?.nomeEleitoral) {
          nome = prop.ultimoStatus.nomeEleitoral
        }
        const ementa = prop.ementa || ''
        if (ementa.length > 10) {
          const propTemas = getTemaFromText(ementa)
          for (const t of propTemas) {
            temas[t]++
          }
        }
      }
      
      const temasArray = [
        temas['Saude'], temas['Seguranca'], temas['Agro'], temas['Educacao'],
        temas['Economia'], temas['Meio Ambiente'], temas['Infraestrutura'], temas['Direitos'],
      ]
      
      const max = Math.max(...temasArray, 1)
      const scores = temasArray.map(t => Math.round((t / max) * 100))
      
      if (scores.some(s => s > 0)) {
        temasData[id] = { nome: nome || `Deputy ${id}`, temas: temasArray, scores }
        console.log(`   ${nome}: ${scores.join(',')}`)
      }
    } catch (e) {
      // continue
    }
    
    await new Promise(r => setTimeout(r, 100))
  }
  
  console.log(`\n💾 Found themes for ${Object.keys(temasData).length} deputies`)
  console.log('\n💾 Saving to', OUTPUT_FILE)
  writeFileSync(OUTPUT_FILE, JSON.stringify(temasData, null, 2))
  console.log('✅ Done!')
}

main().catch(console.error)
