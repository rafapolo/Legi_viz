/**
 * Script para adicionar deputados da Bancada Negra usando a lista do usuário
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DEPUTADOS_FILE = join(process.cwd(), 'public/data/deputados.json')
const BANCADAS_FILE = join(process.cwd(), 'public/data/bancadas.json')

// Lista de deputados da Bancada Negra (fornecida pelo usuário)
const NEGRA_DEPUTIES = [
  { nome: 'Adail Filho', partido: 'REPUBLICANOS', uf: 'AM' },
  { nome: 'Adilson Barroso', partido: 'PL', uf: 'SP' },
  { nome: 'Alexandre Guimarães', partido: 'MDB', uf: 'TO' },
  { nome: 'Alexandre Leite', partido: 'UNIÃO', uf: 'SP' },
  { nome: 'Alfredinho', partido: 'PT', uf: 'SP' },
  { nome: 'Alice Portugal', partido: 'PCdoB', uf: 'BA' },
  { nome: 'Amanda Gentil', partido: 'PP', uf: 'MA' },
  { nome: 'André Abdon', partido: 'PP', uf: 'AP' },
  { nome: 'André Fernandes', partido: 'PL', uf: 'CE' },
  { nome: 'André Ferreira', partido: 'PL', uf: 'PE' },
  { nome: 'Andréia Siqueira', partido: 'MDB', uf: 'PA' },
  { nome: 'Antonia Lúcia', partido: 'REPUBLICANOS', uf: 'AC' },
  { nome: 'Antonio Andrade', partido: 'REPUBLICANOS', uf: 'TO' },
  { nome: 'Antonio Brito', partido: 'PSD', uf: 'BA' },
  { nome: 'Arthur Lira', partido: 'PP', uf: 'AL' },
  { nome: 'Benedita da Silva', partido: 'PT', uf: 'RJ' },
  { nome: 'Beto Pereira', partido: 'PSDB', uf: 'MS' },
  { nome: 'Capitão Alden', partido: 'PL', uf: 'BA' },
  { nome: 'Carlos Gomes', partido: 'REPUBLICANOS', uf: 'RS' },
  { nome: 'Carlos Henrique Gaguim', partido: 'UNIÃO', uf: 'TO' },
  { nome: 'Carol Dartora', partido: 'PT', uf: 'PR' },
  { nome: 'Charles Fernandes', partido: 'PSD', uf: 'BA' },
  { nome: 'Claudio Cajado', partido: 'PP', uf: 'BA' },
  { nome: 'Cleber Verde', partido: 'MDB', uf: 'MA' },
  { nome: 'Coronel Assis', partido: 'UNIÃO', uf: 'MT' },
  { nome: 'Coronel Ulysses', partido: 'UNIÃO', uf: 'AC' },
  { nome: 'Cristiane Lopes', partido: 'UNIÃO', uf: 'RO' },
  { nome: 'Da Vitoria', partido: 'PP', uf: 'ES' },
  { nome: 'Daiana Santos', partido: 'PCdoB', uf: 'RS' },
  { nome: 'Dal Barreto', partido: 'UNIÃO', uf: 'BA' },
  { nome: 'Damião Feliciano', partido: 'UNIÃO', uf: 'PB' },
  { nome: 'Dandara', partido: 'PT', uf: 'MG' },
  { nome: 'Danilo Forte', partido: 'UNIÃO', uf: 'CE' },
  { nome: 'Defensor Stélio Dener', partido: 'REPUBLICANOS', uf: 'RR' },
  { nome: 'Delegado Caveira', partido: 'PL', uf: 'PA' },
  { nome: 'Delegado da Cunha', partido: 'PP', uf: 'SP' },
  { nome: 'Delegado Éder Mauro', partido: 'PL', uf: 'PA' },
  { nome: 'Delegado Fabio Costa', partido: 'PP', uf: 'AL' },
  { nome: 'Delegado Marcelo Freitas', partido: 'UNIÃO', uf: 'MG' },
  { nome: 'Denise Pessôa', partido: 'PT', uf: 'RS' },
  { nome: 'Dilvanda Faro', partido: 'PT', uf: 'PA' },
  { nome: 'Dimas Gadelha', partido: 'PT', uf: 'RJ' },
  { nome: 'Dorinaldo Malafaia', partido: 'PDT', uf: 'AP' },
  { nome: 'Dr. Francisco', partido: 'PT', uf: 'PI' },
  { nome: 'Duarte Jr.', partido: 'PSB', uf: 'MA' },
  { nome: 'Elisangela Araujo', partido: 'PT', uf: 'BA' },
  { nome: 'Ely Santos', partido: 'REPUBLICANOS', uf: 'SP' },
  { nome: 'Enfermeira Rejane', partido: 'PCdoB', uf: 'RJ' },
  { nome: 'Erika Hilton', partido: 'PSOL', uf: 'SP' },
  { nome: 'Eunício Oliveira', partido: 'MDB', uf: 'CE' },
  { nome: 'Fatima Pelaes', partido: 'REPUBLICANOS', uf: 'AP' },
  { nome: 'Félix Mendonça Júnior', partido: 'PDT', uf: 'BA' },
  { nome: 'Fernando Mineiro', partido: 'PT', uf: 'RN' },
  { nome: 'Fernando Rodolfo', partido: 'PL', uf: 'PE' },
  { nome: 'Filipe Martins', partido: 'PL', uf: 'TO' },
  { nome: 'Gilson Daniel', partido: 'PODE', uf: 'ES' },
  { nome: 'Gilvan da Federal', partido: 'PL', uf: 'ES' },
  { nome: 'Gisela Simona', partido: 'UNIÃO', uf: 'MT' },
  { nome: 'Helena Lima', partido: 'MDB', uf: 'RR' },
  { nome: 'Heloísa Helena', partido: 'REDE', uf: 'RJ' },
  { nome: 'Henderson Pinto', partido: 'MDB', uf: 'PA' },
  { nome: 'Igor Timo', partido: 'PSD', uf: 'MG' },
  { nome: 'Ivoneide Caetano', partido: 'PT', uf: 'BA' },
  { nome: 'Jack Rocha', partido: 'PT', uf: 'ES' },
  { nome: 'Jadyel Alencar', partido: 'REPUBLICANOS', uf: 'PI' },
  { nome: 'Jeferson Rodrigues', partido: 'REPUBLICANOS', uf: 'GO' },
  { nome: 'Jorge Braz', partido: 'REPUBLICANOS', uf: 'RJ' },
  { nome: 'José Guimarães', partido: 'PT', uf: 'CE' },
  { nome: 'José Rocha', partido: 'UNIÃO', uf: 'BA' },
  { nome: 'Joseildo Ramos', partido: 'PT', uf: 'BA' },
  { nome: 'Josenildo', partido: 'PDT', uf: 'AP' },
  { nome: 'Josivaldo JP', partido: 'PSD', uf: 'MA' },
  { nome: 'Julio Arcoverde', partido: 'PP', uf: 'PI' },
  { nome: 'Junior Lourenço', partido: 'PL', uf: 'MA' },
  { nome: 'Laura Carneiro', partido: 'PSD', uf: 'RJ' },
  { nome: 'Leo Prates', partido: 'PDT', uf: 'BA' },
  { nome: 'Leonardo Monteiro', partido: 'PT', uf: 'MG' },
  { nome: 'Lídice da Mata', partido: 'PSB', uf: 'BA' },
  { nome: 'Lucas Abrahao', partido: 'REDE', uf: 'AP' },
  { nome: 'Luciano Alves', partido: 'PSD', uf: 'PR' },
  { nome: 'Luis Carlos Gomes', partido: 'REPUBLICANOS', uf: 'RJ' },
  { nome: 'Luiz Gastão', partido: 'PSD', uf: 'CE' },
  { nome: 'Marcelo Moraes', partido: 'PL', uf: 'RS' },
  { nome: 'Márcio Jerry', partido: 'PCdoB', uf: 'MA' },
  { nome: 'Márcio Marinho', partido: 'REPUBLICANOS', uf: 'BA' },
  { nome: 'Marcos Pereira', partido: 'REPUBLICANOS', uf: 'SP' },
  { nome: 'Matheus Noronha', partido: 'PL', uf: 'CE' },
  { nome: 'Max Lemos', partido: 'PDT', uf: 'RJ' },
  { nome: 'Meire Serafim', partido: 'UNIÃO', uf: 'AC' },
  { nome: 'Mendonça Filho', partido: 'UNIÃO', uf: 'PE' },
  { nome: 'Messias Donato', partido: 'REPUBLICANOS', uf: 'ES' },
  { nome: 'Miguel Ângelo', partido: 'PT', uf: 'MG' },
  { nome: 'Neto Carletto', partido: 'AVANTE', uf: 'BA' },
  { nome: 'Olival Marques', partido: 'MDB', uf: 'PA' },
  { nome: 'Orlando Silva', partido: 'PCdoB', uf: 'SP' },
  { nome: 'Ossesio Silva', partido: 'REPUBLICANOS', uf: 'PE' },
  { nome: 'Otoni de Paula', partido: 'MDB', uf: 'RJ' },
  { nome: 'Padre João', partido: 'PT', uf: 'MG' },
  { nome: 'Pastor Diniz', partido: 'UNIÃO', uf: 'RR' },
  { nome: 'Pastor Gil', partido: 'PL', uf: 'MA' },
  { nome: 'Pastor Henrique Vieira', partido: 'PSOL', uf: 'RJ' },
  { nome: 'Pastor Sargento Isidório', partido: 'AVANTE', uf: 'BA' },
  { nome: 'Paulão', partido: 'PT', uf: 'AL' },
  { nome: 'Paulo Marinho Jr', partido: 'PL', uf: 'MA' },
  { nome: 'Pedro Lucas Fernandes', partido: 'UNIÃO', uf: 'MA' },
  { nome: 'Pinheirinho', partido: 'PP', uf: 'MG' },
  { nome: 'Prof. Reginaldo Veras', partido: 'PV', uf: 'DF' },
  { nome: 'Rafael Fera', partido: 'PODE', uf: 'RO' },
  { nome: 'Raimundo Costa', partido: 'PODE', uf: 'BA' },
  { nome: 'Raimundo Santos', partido: 'PSD', uf: 'PA' },
  { nome: 'Reimont', partido: 'PT', uf: 'RJ' },
  { nome: 'Renilce Nicodemos', partido: 'MDB', uf: 'PA' },
  { nome: 'Ribeiro Neto', partido: 'PRD', uf: 'MA' },
  { nome: 'Ricardo Ayres', partido: 'REPUBLICANOS', uf: 'TO' },
  { nome: 'Robério Monteiro', partido: 'PDT', uf: 'CE' },
  { nome: 'Roberto Monteiro Pai', partido: 'PL', uf: 'RJ' },
  { nome: 'Rosângela Reis', partido: 'PL', uf: 'MG' },
  { nome: 'Samuel Viana', partido: 'REPUBLICANOS', uf: 'MG' },
  { nome: 'Sargento Portugal', partido: 'PODE', uf: 'RJ' },
  { nome: 'Sérgio Brito', partido: 'PSD', uf: 'BA' },
  { nome: 'Sidney Leite', partido: 'PSD', uf: 'AM' },
  { nome: 'Silas Câmara', partido: 'REPUBLICANOS', uf: 'AM' },
  { nome: 'Silvia Cristina', partido: 'PP', uf: 'RO' },
  { nome: 'Silvio Antonio', partido: 'PL', uf: 'MA' },
  { nome: 'Silvye Alves', partido: 'UNIÃO', uf: 'GO' },
  { nome: 'Soldado Noelio', partido: 'UNIÃO', uf: 'CE' },
  { nome: 'Talíria Petrone', partido: 'PSOL', uf: 'RJ' },
  { nome: 'Thiago de Joaldo', partido: 'PP', uf: 'SE' },
  { nome: 'Tiririca', partido: 'PSD', uf: 'SP' },
  { nome: 'Valmir Assunção', partido: 'PT', uf: 'BA' },
  { nome: 'Vicentinho', partido: 'PT', uf: 'SP' },
  { nome: 'Vicentinho Júnior', partido: 'PSDB', uf: 'TO' },
  { nome: 'Weliton Prado', partido: 'SOLIDARIEDADE', uf: 'MG' },
  { nome: 'Wellington Roberto', partido: 'PL', uf: 'PB' },
  { nome: 'Wilson Santiago', partido: 'REPUBLICANOS', uf: 'PB' },
  { nome: 'Zé Adriano', partido: 'PP', uf: 'AC' },
  { nome: 'Zezinho Barbary', partido: 'PP', uf: 'AC' },
]

// Normalize name for matching
function normalizeName(name: string): string {
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  console.log('📥 Fetching current deputados...')
  
  // Fetch all deputados
  const allDeputies: {id: number, nome: string, siglaPartido: string, siglaUf: string}[] = []
  
  for (let page = 1; page <= 10; page++) {
    const url = `https://dadosabertos.camara.leg.br/api/v2/deputados?idLegislatura=57&itens=100&pagina=${page}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) break
    
    const j = await res.json()
    const dados = j.dados ?? []
    if (dados.length === 0) break
    
    dados.forEach((d: any) => {
      allDeputies.push({
        id: d.id,
        nome: d.ultimoStatus?.nomeEleitoral ?? d.nome,
        siglaPartido: d.ultimoStatus?.siglaPartido ?? d.siglaPartido ?? '',
        siglaUf: d.ultimoStatus?.siglaUf ?? d.siglaUf ?? ''
      })
    })
    console.log(`   Page ${page}: ${dados.length} deps, total: ${allDeputies.length}`)
  }
  
  console.log(`\n📊 Total deputados: ${allDeputies.length}`)
  
  // Match deputies by name + party + UF
  const negraIds: number[] = []
  
  for (const NegraDep of NEGRA_DEPUTIES) {
    const normNome = normalizeName(NegraDep.nome)
    
    // Try exact match first
    let match = allDeputies.find(d => 
      normalizeName(d.nome) === normNome &&
      d.siglaPartido === NegraDep.partido &&
      d.siglaUf === NegraDep.uf
    )
    
    // Try partial match
    if (!match) {
      match = allDeputies.find(d => 
        normalizeName(d.nome).includes(normNome) ||
        normNome.includes(normalizeName(d.nome))
      )
    }
    
    if (match) {
      negraIds.push(match.id)
      console.log(`   ✓ ${NegraDep.nome} (${NegraDep.partido}-${NegraDep.uf}) -> ID ${match.id}`)
    } else {
      console.log(`   ✗ ${NegraDep.nome} (${NegraDep.partido}-${NegraDep.uf}) -> NOT FOUND`)
    }
  }
  
  console.log(`\n📊 Found ${negraIds.length} / ${NEGRA_DEPUTIES.length} deputies`)
  
  // Load existing bancadas
  console.log('\n💾 Updating bancadas.json...')
  let bancadas: Record<number, string[]> = {}
  try {
    const data = readFileSync(BANCADAS_FILE, 'utf-8')
    bancadas = JSON.parse(data)
  } catch (e) {
    console.log('   Creating new file')
  }
  
  // Add Negra to matched deputies
  let added = 0
  for (const id of negraIds) {
    if (!bancadas[id]) {
      bancadas[id] = []
    }
    if (!bancadas[id].includes('Negra')) {
      bancadas[id].push('Negra')
      added++
    }
  }
  
  console.log(`   Added Negra to ${added} deputies`)
  
  writeFileSync(BANCADAS_FILE, JSON.stringify(bancadas, null, 2))
  console.log('   Saved!')
}

main().catch(console.error)
