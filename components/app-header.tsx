'use client'

import { useState } from 'react'
import { Menu, X, Search, Users, Info, Accessibility, Github, ExternalLink, Shield } from 'lucide-react'

interface AppHeaderProps {
  onOpenSearch?: () => void
}

export function AppHeader({ onOpenSearch }: AppHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {/* Pixel pattern logo */}
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
              <rect x="0" y="0" width="8" height="8" fill="#0EA5E9" />
              <rect x="8" y="0" width="8" height="8" fill="#16A34A" />
              <rect x="16" y="0" width="8" height="8" fill="#D97706" />
              <rect x="24" y="0" width="8" height="8" fill="#DC2626" />
              <rect x="0" y="8" width="8" height="8" fill="#7C3AED" />
              <rect x="8" y="8" width="8" height="8" fill="#DB2777" />
              <rect x="16" y="8" width="8" height="8" fill="#1D4ED8" />
              <rect x="24" y="8" width="8" height="8" fill="#0D9488" />
              <rect x="0" y="16" width="32" height="16" fill="#060D1A" />
              <text x="16" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace">POLI</text>
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">Poliviz</span>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Painel de Transparência Parlamentar</p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Navegação principal">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-white hover:bg-muted rounded-lg transition-colors"
            >
              <Search size={14} />
              Buscar
            </button>
          )}
          <a
            href="#about"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-white hover:bg-muted rounded-lg transition-colors"
          >
            <Info size={14} />
            Sobre
          </a>
          <a
            href="#accessibility"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-white hover:bg-muted rounded-lg transition-colors"
          >
            <Accessibility size={14} />
            Acessibilidade
          </a>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-white"
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <nav className="p-4 space-y-2" role="navigation" aria-label="Menu mobile">
            {onOpenSearch && (
              <button
                onClick={() => {
                  onOpenSearch()
                  setMobileMenuOpen(false)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-white hover:bg-muted rounded-lg"
              >
                <Search size={16} />
                Buscar Parlamentar
              </button>
            )}
            <a
              href="#about"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-white hover:bg-muted rounded-lg"
            >
              <Info size={16} />
              Sobre o Projeto
            </a>
            <a
              href="#accessibility"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-white hover:bg-muted rounded-lg"
            >
              <Accessibility size={16} />
              Acessibilidade
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}

// Footer com disclaimer global
export function AppFooter() {
  return (
    <footer className="bg-card border-t border-border py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Disclaimer global */}
        <div className="bg-muted rounded-lg p-4 mb-6 text-xs text-muted-foreground">
          <p className="mb-2">
            <strong className="text-white">Aviso Legal:</strong> Este site agrega dados de fontes públicas oficiais 
            (Câmara, Senado, TSE, STF, Portal da Transparência). Não produzimos nem verificamos os dados — 
            apenas os organizamos e apresentamos de forma acessível.
          </p>
          <p className="mb-2">
            Dados podem estar desatualizados em relação às fontes originais. Sempre que possível, 
            indicamos a data da última atualização e o link para a fonte.
          </p>
          <p className="mb-2">
            Esta plataforma não emite julgamentos sobre parlamentares. Toda informação é objetiva e 
            atribuída à sua fonte original.
          </p>
          <p>
            Encontrou um erro? Use o botão "Contestar dado" em qualquer módulo. Respondemos em até 5 dias úteis.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Poliviz · Dados Abertos para Democracia
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="/privacidade" className="hover:text-white flex items-center gap-1">
              <Shield size={14} />
              Privacidade
            </a>
            <a href="#" className="hover:text-white flex items-center gap-1">
              <Github size={14} />
              Código Aberto
            </a>
            <a href="#" className="hover:text-white flex items-center gap-1">
              <ExternalLink size={14} />
              API Pública
            </a>
            <span>WCAG 2.1 AA</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50 text-center text-[10px] text-muted-foreground">
          <p>
            Fontes de dados: API da Câmara dos Deputados · API do Senado Federal · 
            TSE Divulga Contas · Portal da Transparência · STF
          </p>
          <p className="mt-1">
            Stack: Next.js · TypeScript · D3.js · Recharts · Tailwind CSS
          </p>
          <p className="mt-2 text-green-500/70">
            Conforme à LGPD (Lei 13.709/2018) · Sem rastreamento ·{' '}
            <a href="/privacidade" className="underline hover:text-green-500">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
