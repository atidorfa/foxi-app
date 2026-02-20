'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function VerifyContent() {
  const params = useSearchParams()
  const error = params.get('error')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (error) {
      const messages: Record<string, string> = {
        missing_token: 'El link de verificación es inválido.',
        invalid_token: 'El link ya fue usado o no existe.',
        expired_token: 'El link expiró. Registrate de nuevo para recibir uno nuevo.',
      }
      setErrorMsg(messages[error] ?? 'Ocurrió un error inesperado.')
      setStatus('error')
    } else {
      setStatus('success')
    }
  }, [error])

  return (
    <div className="rounded-2xl border border-white/8 bg-[#13131F]/90 backdrop-blur-sm p-8 text-center space-y-5">
      {status === 'loading' && (
        <>
          <div className="text-4xl animate-spin">⚙️</div>
          <p className="text-[#8B84B0]">Verificando...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="text-5xl">✅</div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">¡Email verificado!</h2>
            <p className="text-[#8B84B0] text-sm">Tu cuenta está activa. Ya podés iniciar sesión.</p>
          </div>
          <Link
            href="/login"
            className="inline-block w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400 transition-all"
          >
            Iniciar sesión
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="text-5xl">❌</div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Link inválido</h2>
            <p className="text-[#8B84B0] text-sm">{errorMsg}</p>
          </div>
          <Link
            href="/login"
            className="inline-block w-full py-3 rounded-xl font-bold border border-white/10 text-[#8B84B0] hover:text-white hover:border-white/20 transition-colors"
          >
            Volver al inicio
          </Link>
        </>
      )}
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08080F] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10 bg-purple-700" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight gradient-text mb-1">therian.biz</h1>
        </div>

        <Suspense fallback={
          <div className="rounded-2xl border border-white/8 bg-[#13131F]/90 p-8 text-center text-[#8B84B0]">
            Verificando...
          </div>
        }>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  )
}
