'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'error' | 'success' | ''; message: string }>({
    type: '',
    message: '',
  })

  useEffect(() => {
    if (!token) {
      setStatus({
        type: 'error',
        message: 'Недействительная ссылка. Токен сброса пароля отсутствует.',
      })
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus({ type: '', message: '' })

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Пароли не совпадают.' })
      return
    }

    if (password.length < 6) {
      setStatus({ type: 'error', message: 'Пароль должен содержать минимум 6 символов.' })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/users/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          new_password: password,
        }),
      })

      const data = await res.json().catch(() => null)

      if (res.ok) {
        setStatus({
          type: 'success',
          message: data?.message || 'Пароль успешно изменен! Перенаправляем на страницу входа...',
        })
        setTimeout(() => {
          router.push('/')
        }, 2500)
      } else {
        setStatus({
          type: 'error',
          message: data?.detail || 'Не удалось обновить пароль. Срок действия ссылки истек.',
        })
      }
    } catch {
      setStatus({
        type: 'error',
        message: 'Ошибка соединения с сервером. Попробуйте позже.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-[440px] px-4 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-foreground ring-1 ring-black/5">
          <KeyRound className="size-6 text-primary" strokeWidth={1.75} />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Новый пароль
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Введите новый пароль для доступа к личному кабинету
        </p>
      </div>

      <div className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-black/5 sm:p-8">
        {status.message && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-xl p-4 text-sm ${status.type === 'error'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
          >
            {status.type === 'error' ? (
              <AlertCircle className="size-5 shrink-0" />
            ) : (
              <CheckCircle2 className="size-5 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        {token && status.type !== 'success' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-foreground">Новый пароль</label>
              <input
                type="password"
                required
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="mt-1.5 flex h-11 w-full rounded-xl bg-secondary px-3.5 text-sm text-foreground ring-1 ring-black/5 transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Повторите пароль</label>
              <input
                type="password"
                required
                placeholder="Повторите новый пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="mt-1.5 flex h-11 w-full rounded-xl bg-secondary px-3.5 text-sm text-foreground ring-1 ring-black/5 transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button size="lg" type="submit" disabled={isLoading} className="mt-2 w-full gap-2 text-base">
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить пароль'
              )}
            </Button>
          </form>
        ) : (
          status.type !== 'success' && (
            <div className="text-center">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Перейти ко входу
                </Button>
              </Link>
            </div>
          )
        )}

        <div className="mt-6 border-t border-border/60 pt-5 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Вернуться на страницу входа
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-background pt-28 pb-20">
      <Suspense
        fallback={
          <div className="flex justify-center pt-10">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  )
}