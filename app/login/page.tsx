'use client'

import { Suspense, useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('verified') === '1') {
      setSuccess('✓ Email verificado. Ya podés iniciar sesión.')
    }
  }, [params])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)
    if (result?.error === 'EMAIL_NOT_VERIFIED') {
      setError('Verificá tu email antes de iniciar sesión. Revisá tu bandeja de entrada.')
    } else if (result?.error) {
      setError('Credenciales incorrectas. Verificá tu email y contraseña.')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await res.json()
      setLoading(false)

      if (!res.ok) {
        if (data.error === 'EMAIL_TAKEN') {
          setError('Ese email ya está en uso.')
        } else if (data.error === 'INVALID_INPUT') {
          setError('El email o la contraseña no son válidos.')
        } else {
          setError('Error al crear la cuenta. Verificá los datos.')
        }
        return
      }

      setSuccess('¡Cuenta creada! Te enviamos un email de verificación. Revisá tu bandeja de entrada (y el spam).')
      setPassword('')
      setMode('login')
    } catch {
      setLoading(false)
      setError('Error de conexión.')
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#13131F]/90 backdrop-blur-sm p-8 space-y-6">
      {/* Tabs */}
      <div className="flex rounded-xl bg-white/5 p-1">
        {(['login', 'register'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setMode(tab); setError(null); setSuccess(null) }}
            className={`
              flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${mode === tab
                ? 'bg-purple-600/50 text-white shadow-sm'
                : 'text-[#8B84B0] hover:text-white'}
            `}
          >
            {tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label className="block text-[#8B84B0] text-xs uppercase tracking-widest mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="¿Cómo te llamás?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#4A4468] focus:outline-none focus:border-purple-500/60 focus:bg-white/8 transition-all duration-200"
            />
          </div>
        )}

        <div>
          <label className="block text-[#8B84B0] text-xs uppercase tracking-widest mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#4A4468] focus:outline-none focus:border-purple-500/60 focus:bg-white/8 transition-all duration-200"
          />
        </div>

        <div>
          <label className="block text-[#8B84B0] text-xs uppercase tracking-widest mb-1.5">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
            required
            minLength={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#4A4468] focus:outline-none focus:border-purple-500/60 focus:bg-white/8 transition-all duration-200"
          />
        </div>

        {success && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-green-300 text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-[0_0_20px_rgba(155,89,182,0.3)]"
        >
          {loading
            ? (mode === 'login' ? 'Entrando...' : 'Creando cuenta...')
            : (mode === 'login' ? 'Entrar' : 'Crear cuenta')
          }
        </button>
      </form>

      <div className="pt-2 border-t border-white/5">
        <p className="text-center text-[#4A4468] text-xs">
          Al adoptarlo: 70% Común · 20% Raro · 9% Épico · 1% Legendario
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#08080F]">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-purple-900/10 blur-[120px]"/>
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-900/10 blur-[100px]"/>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.5 + 0.1,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md mx-4">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold tracking-tight gradient-text mb-2">therian.biz</h1>
          <p className="text-[#8B84B0] text-base italic">Tu compañero ya existe.</p>
        </div>

        <Suspense fallback={<div className="rounded-2xl border border-white/8 bg-[#13131F]/90 p-8 text-center text-[#8B84B0]">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
