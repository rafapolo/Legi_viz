export const dynamic = 'force-static'

import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, filters, clusterMode, question } = body

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const realDataCount = data?.filter((p: { hasTseMatch?: boolean }) => p.hasTseMatch).length || 0
    const generoCounts = data?.reduce((acc: Record<string, number>, p: { genero: string }) => {
      acc[p.genero] = (acc[p.genero] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    const racaCounts = data?.reduce((acc: Record<string, number>, p: { raca: string }) => {
      acc[p.raca] = (acc[p.raca] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    const femaleDeputies = data?.filter((p: { tipo: string; genero: string }) => p.tipo === 'DEPUTADO_FEDERAL' && p.genero === 'Mulher').length || 0
    const maleDeputies = data?.filter((p: { tipo: string; genero: string }) => p.tipo === 'DEPUTADO_FEDERAL' && p.genero === 'Homem').length || 0
    
    const prompt = question || `You are a Brazilian Congress data expert. Analyze this parliamentarian data to identify and FIX data issues.

CRITICAL ISSUES TO FIND AND FIX:
1. GENDER: Most parliamentarians show "Homem" - verify against names. Brazilian Congress has ~103 women and ~410 men in Chamber.
2. RACE: Most show "Branco" (random fallback) - TSE data should have more Pardo/Preto
3. ALIGNMENT: Currently RANDOM - should use party-based logic
4. DATA SOURCE: Chamber API has "sexo" field (M/F) - USE IT!

REALITY CHECK:
- Total: ${data?.length || 0}
- With real TSE data: ${realDataCount}
- Gender: ${JSON.stringify(generoCounts)}
- Race: ${JSON.stringify(racaCounts)}
- Women deputies: ${femaleDeputies}, Men: ${maleDeputies}

SAMPLE (first 15):
${JSON.stringify(data?.slice(0, 15).map((p: { id: string; nome: string; nomeUrna: string; partido: string; tipo: string; genero: string; raca: string; alinhamento: number }) => ({
  id: p.id,
  nome: p.nome,
  nomeUrna: p.nomeUrna,
  partido: p.partido,
  tipo: p.tipo,
  genero: p.genero,
  raca: p.raca,
  alinhamento: p.alinhamento
})), null, 2)}

YOUR TASK - BE VERY SPECIFIC:
1. For EACH parliamentarian with WRONG gender, return correction with their ID
2. For wrong race, return correction  
3. For wrong party, return correction
4. Check if female names are labeled as "Homem" - FIX THESE

Party alignment rules for Brazil:
- Left (esquerda): PT, PSOL, PCdoB, PV, Rede
- Center (centro): MDB, PSD,PSB, PDT, SD, Podemos, Avante, Progressistas
- Right (direita): PL, PP, Republicanos, NOVO, PSDD, DC

Use party to determine alignment, not random!

Respond ONLY with JSON:
{
  "analysis": {
    "total": number,
    "realData": number,
    "fakeData": number,
    "genderIssues": number,
    "raceIssues": number,
    "alignmentIssues": number
  },
  "corrections": [
    { "id": "DEP-123456", "field": "genero", "current": "Homem", "corrected": "Mulher", "reason": "Name is female (Maria/Joana/Ana)" }
  ],
  "alignmentFix": {
    "rules": { "PT": "esquerda", "PL": "direita", etc }
  },
  "recommendations": ["fix 1", "fix 2"]
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: 'Claude API error', details: error }, { status: response.status })
    }

    const result = await response.json()
    const content = result.content?.[0]?.text || ''

    let parsed
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }
    } catch {
      parsed = { rawResponse: content }
    }

    return NextResponse.json({
      success: true,
      dataSummary: {
        total: data?.length || 0,
        realData: realDataCount,
        generoCounts,
        racaCounts,
        femaleDeputies,
        maleDeputies,
      },
      analysis: parsed,
      rawClaude: content,
    })
  } catch (error) {
    console.error('[Claude API]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
