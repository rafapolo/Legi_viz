'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { ArrowLeft, Shield, Eye, Database, Trash2 } from 'lucide-react'

export default function PrivacyPage() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('legi-viz-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored === 'dark' || (!stored && prefersDark)
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const handleDeleteData = () => {
    if (confirm('Tem certeza que deseja excluir todos os seus dados salvos? Esta ação não pode ser desfeita.')) {
      // Delete all legi-viz localStorage data
      const keysToDelete = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('legi-viz-')) {
          keysToDelete.push(key)
        }
      }
      keysToDelete.forEach(key => localStorage.removeItem(key))
      alert('Dados excluídos com sucesso!')
    }
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#FAFAFA] text-black'}`}>
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <ArrowLeft size={18} />
          <span className="text-sm">Voltar</span>
        </Link>
        <Logo className="h-5" isDark={isDark} />
        <div className="w-20" />
      </header>

      {/* Main */}
      <main id="main-content" className="flex-1 max-w-3xl mx-auto w-full p-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className={`text-sm mb-8 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <div className="space-y-8">
          {/* Overview */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Visão Geral</h2>
            <p className={`leading-relaxed ${isDark ? 'text-white/80' : 'text-black/80'}`}>
              O LEGI_VIZ é uma plataforma de transparência legislativa que exibe dados públicos 
              de parlamentares brasileiros. Esta política explica como tratamos seus dados pessoais.
            </p>
          </section>

          {/* Data We Collect */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Database size={20} />
              <h2 className="text-xl font-semibold">Dados que Coletamos</h2>
            </div>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <h3 className="font-medium mb-2">Dados de Navegação (armazenados localmente)</h3>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                  <li>• Preferência de tema (claro/escuro)</li>
                  <li>• Lista de parlamentares salvos por você</li>
                </ul>
                <p className={`text-xs mt-2 ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                  Estes dados ficam apenas no seu navegador e não são transmitidos para nossos servidores.
                </p>
              </div>

              <div className={`p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <h3 className="font-medium mb-2">Dados Públicos de Parlamentares</h3>
                <p className={`text-sm ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                  Exibimos dados públicos oficiais dos parlamentares, incluindo nome, partido, 
                  patrimônio declarado, gastos de gabinete, ementas, e histórico de votações. 
                  Todos estes dados são de domínio público e provienen de fontes governamentais 
                  como TSE, Câmara dos Deputados, e Portal da Transparência.
                </p>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Eye size={20} />
              <h2 className="text-xl font-semibold">Cookies e Rastreamento</h2>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-white/80' : 'text-black/80'}`}>
              <strong>Não utilizamos cookies de rastreamento ou análise.</strong> O único 
              armazenamento local (localStorage) é usado para salvar suas preferências 
              de interface, que você pode excluir a qualquer momento.
            </p>
          </section>

          {/* Data Source */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={20} />
              <h2 className="text-xl font-semibold">Fontes de Dados</h2>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-white/80' : 'text-black/80'}`}>
              Todos os dados de parlamentares exibidos no LEGI_VIZ são obtidos de fontes 
              públicas oficiais:
            </p>
            <ul className={`text-sm mt-2 space-y-1 ${isDark ? 'text-white/70' : 'text-black/70'}`}>
              <li>• Tribunal Superior Eleitoral (TSE)</li>
              <li>• Câmara dos Deputados (dadosabertos.camara.leg.br)</li>
              <li>• Portal da Transparência (Transferegov)</li>
              <li>• Senado Federal</li>
            </ul>
          </section>

          {/* LGPD Rights */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Seus Direitos (LGPD)</h2>
            <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-white/80' : 'text-black/80'}`}>
              De acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:
            </p>
            <ul className={`text-sm space-y-2 ${isDark ? 'text-white/70' : 'text-black/70'}`}>
              <li>• <strong>Acessar</strong> seus dados pessoais que possuímos</li>
              <li>• <strong>Corrigir</strong> dados incompletos ou desatualizados</li>
              <li>• <strong>Excluir</strong> seus dados pessoais</li>
              <li>• <strong>Solicitar informações</strong> sobre o compartilhamento de dados</li>
            </ul>
          </section>

          {/* Delete Data */}
          <section className={`p-6 rounded-lg border ${isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={20} className="text-red-500" />
              <h2 className="text-xl font-semibold text-red-500">Excluir seus Dados</h2>
            </div>
            <p className={`text-sm mb-4 ${isDark ? 'text-white/80' : 'text-black/80'}`}>
              Como não armazenamos seus dados em nossos servidores, você pode excluir 
              todos os dados locais salvos no seu navegador a qualquer momento:
            </p>
            <button
              onClick={handleDeleteData}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Excluir meus dados salvos
            </button>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Contato</h2>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-white/80' : 'text-black/80'}`}>
              Para dúvidas sobre esta política de privacidade ou para exercer seus direitos, 
              entre em contato através do repositório do projeto no GitHub.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className={`p-6 text-center text-xs ${isDark ? 'text-white/40 border-t border-white/10' : 'text-black/40 border-t border-black/10'}`}>
        <Link href="/privacidade" className="hover:underline">
          Política de Privacidade
        </Link>
        {' · '}
        <Link href="/termos" className="hover:underline">
          Termos de Uso
        </Link>
      </footer>
    </div>
  )
}
