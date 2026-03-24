export const dynamic = 'force-static'

import { NextRequest, NextResponse } from 'next/server'

interface NewsItem {
  title: string
  source: string
  date: string
  url: string
  img?: string
}

// Busca notícias do Google News RSS
async function fetchGoogleNews(query: string): Promise<NewsItem[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
      },
      next: { revalidate: 3600 } // Cache por 1 hora
    })
    
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`)
    }
    
    const xml = await response.text()
    
    // Parse XML simples
    const items: NewsItem[] = []
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || []
    
    for (const itemXml of itemMatches.slice(0, 8)) {
      const title = extractTag(itemXml, 'title')
      const link = extractTag(itemXml, 'link')
      const pubDate = extractTag(itemXml, 'pubDate')
      const source = extractTag(itemXml, 'source')
      
      if (title && link) {
        items.push({
          title: decodeHtmlEntities(title),
          source: source || 'Google News',
          date: formatDate(pubDate),
          url: link,
        })
      }
    }
    
    // Busca imagens das matérias em paralelo
    const itemsWithImages = await Promise.all(
      items.map(async (item) => {
        const img = await fetchArticleImage(item.url)
        return img ? { ...item, img } : item
      })
    )
    
    return itemsWithImages
  } catch (error) {
    console.error('Erro ao buscar notícias:', error)
    return []
  }
}

// Extrai tag do XML
function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  if (match) {
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
  }
  return ''
}

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

// Formata data
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// Busca imagem og:image do artigo
async function fetchArticleImage(url: string): Promise<string | undefined> {
  try {
    // Resolve redirect do Google News
    const finalUrl = url.includes('news.google.com') 
      ? await resolveGoogleNewsUrl(url) 
      : url
    
    if (!finalUrl) return undefined
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    
    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) return undefined
    
    const html = await response.text()
    
    // Busca og:image
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    
    if (ogMatch && ogMatch[1]) {
      const imgUrl = ogMatch[1]
      // Valida se é uma URL de imagem válida
      if (imgUrl.startsWith('http') && !imgUrl.includes('logo') && !imgUrl.includes('favicon')) {
        return imgUrl
      }
    }
    
    return undefined
  } catch {
    return undefined
  }
}

// Resolve URL do Google News para URL real
async function resolveGoogleNewsUrl(googleUrl: string): Promise<string | undefined> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    
    const response = await fetch(googleUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    })
    
    clearTimeout(timeout)
    
    return response.url
  } catch {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const nome = searchParams.get('nome')
  const partido = searchParams.get('partido')
  
  if (!nome) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }
  
  // Busca com nome + contexto político
  const query = `"${nome}" ${partido || ''} congresso OR câmara OR senado`
  const news = await fetchGoogleNews(query)
  
  return NextResponse.json({ news })
}
