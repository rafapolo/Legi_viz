'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isDark, setIsDark] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('legi-viz-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored === 'dark' || (!stored && prefersDark)
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simular login
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Salvar usuario no localStorage (mock)
    const user = { email, name: email.split('@')[0] }
    localStorage.setItem('legi-viz-user', JSON.stringify(user))
    
    setLoading(false)
    router.push('/')
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-[#0A0A0A] text-white' : 'bg-[#FAFAFA] text-black'}`}>
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <ArrowLeft size={18} />
          <span className="text-sm">Voltar</span>
        </Link>
        <Logo className="h-5" isDark={isDark} />
        <div className="w-20" />
      </header>

      {/* Main */}
      <main id="main-content" className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Entrar</h1>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              Acesse sua conta para salvar e acompanhar parlamentares
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className={`text-sm mb-2 block ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                Email
              </label>
              <div className="relative">
                <Mail size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className={`w-full pl-10 pr-4 py-3 rounded-lg text-sm ${
                    isDark 
                      ? 'bg-white/10 text-white placeholder:text-white/40 focus:bg-white/15' 
                      : 'bg-black/5 text-black placeholder:text-black/40 focus:bg-black/10'
                  } outline-none transition-colors`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={`text-sm mb-2 block ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                Senha
              </label>
              <div className="relative">
                <Lock size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                  className={`w-full pl-10 pr-12 py-3 rounded-lg text-sm ${
                    isDark 
                      ? 'bg-white/10 text-white placeholder:text-white/40 focus:bg-white/15' 
                      : 'bg-black/5 text-black placeholder:text-black/40 focus:bg-black/10'
                  } outline-none transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70'}`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-3">
            <Link 
              href="#" 
              className={`text-sm ${isDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}
            >
              Esqueceu a senha?
            </Link>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              Nao tem conta?{' '}
              <Link href="/cadastro" className="text-green-500 hover:underline font-medium">
                Cadastre-se
              </Link>
            </p>
          </div>

          {/* Note about data */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
            <p className={`text-xs ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              Seus dados são armazenados apenas localmente. 
              Veja nossa{' '}
              <Link href="/privacidade" className="text-green-500 hover:underline">
                Política de Privacidade
              </Link>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`p-6 text-center text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>
        Ao entrar, voce concorda com nossos Termos de Uso e Politica de Privacidade.
      </footer>
    </div>
  )
}
