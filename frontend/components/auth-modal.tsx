'use client'

import { Lock, Mail, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'

type Mode = 'login' | 'register' | 'reset'

export function AuthModal() {
  const { modalOpen, closeModal, login } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modalOpen, closeModal])

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    } else {
      // Сбрасываем стейт при закрытии
      setMode('login')
      setError(null)
      setResetMsg(null)
    }
  }, [modalOpen])

  if (!modalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResetMsg(null)

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailOk) {
      setError('Введите корректный e-mail.')
      return
    }

    // ЛОГИКА СБРОСА ПАРОЛЯ
    if (mode === 'reset') {
      try {
        const res = await fetch('/api/users/password-reset/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() })
        })
        if (res.ok) {
          setResetMsg('Если email найден, ссылка для сброса отправлена на почту.')
        } else {
          setError('Произошла ошибка при запросе.')
        }
      } catch (err) {
        setError('Сетевая ошибка.')
      }
      return
    }

    // ЛОГИКА ВХОДА/РЕГИСТРАЦИИ
    if (!password.trim() || (mode === 'register' && !name.trim())) {
      setError('Пожалуйста, заполните все поля.')
      return
    }

    const success = await login({
      name: name.trim() || email.split('@')[0],
      email: email.trim(),
      password: password.trim(),
      isRegister: mode === 'register'
    })

    if (!success) {
      setError(mode === 'login' ? 'Неверный E-mail или пароль.' : 'Ошибка регистрации. Возможно, E-mail уже занят.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Закрыть окно"
        onClick={closeModal}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <div className="px-6 pt-8 pb-6 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">Личный кабинет</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
            {mode === 'login' ? 'Вход' : mode === 'register' ? 'Регистрация' : 'Сброс пароля'}
          </h2>

          {mode !== 'reset' && (
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-secondary/50 p-1">
              {(['login', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m)
                    setError(null)
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {m === 'login' ? 'Вход' : 'Регистрация'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <Field icon={<User className="size-4" />} type="text" placeholder="Ваше имя" value={name} onChange={setName} autoComplete="name" />
            )}

            <Field icon={<Mail className="size-4" />} type="email" placeholder="E-mail" value={email} onChange={setEmail} autoComplete="email" />

            {mode !== 'reset' && (
              <div className="space-y-1">
                <Field icon={<Lock className="size-4" />} type="password" placeholder="Пароль" value={password} onChange={setPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                {mode === 'login' && (
                  <div className="text-right">
                    <button type="button" onClick={() => { setMode('reset'); setError(null); }} className="text-xs text-muted-foreground hover:text-primary">
                      Забыли пароль?
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {resetMsg && <p className="text-sm text-primary">{resetMsg}</p>}

            <Button type="submit" className="w-full">
              {mode === 'login' ? 'Войти' : mode === 'register' ? 'Создать аккаунт' : 'Восстановить пароль'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === 'reset' ? 'Вспомнили пароль?' : mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' || mode === 'reset' ? 'register' : 'login')
                setError(null)
              }}
              className="font-medium text-accent transition-colors hover:text-primary"
            >
              {mode === 'reset' ? 'Войти' : mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ icon, type, placeholder, value, onChange, autoComplete }: any) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2.5 transition-colors focus-within:border-accent/70">
      <span className="text-silver">{icon}</span>
      <input
        type={type} placeholder={placeholder} value={value} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </label>
  )
}