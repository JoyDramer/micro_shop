'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type AuthUser = {
  name: string
  email: string
}

type AuthCredentials = {
  name?: string
  email: string
  password?: string
  isRegister?: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null // 1. Добавили токен в тип
  isAuthed: boolean
  modalOpen: boolean
  openModal: () => void
  closeModal: () => void
  requestAccount: () => void
  login: (credentials: AuthCredentials) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null) // 2. Храним токен в стейте
  const [modalOpen, setModalOpen] = useState(false)

  // ВОССТАНОВЛЕНИЕ СЕССИИ ПРИ ЗАГРУЗКЕ
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = getCookie('token')
      if (!savedToken) return

      try {
        const res = await fetch('/api/auth/users/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${savedToken}`
          }
        })

        if (res.ok) {
          const data = await res.json()
          setToken(savedToken) // 3. Устанавливаем токен
          setUser({
            name: data.email.split('@')[0],
            email: data.email,
          })
        } else {
          document.cookie = 'token=; path=/; max-age=0'
          setToken(null)
        }
      } catch (err) {
        console.error('Ошибка проверки токена при загрузке:', err)
      }
    }

    checkAuth()
  }, [])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      try {
        let res

        if (credentials.isRegister) {
          res = await fetch('/api/auth/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })
        } else {
          const formData = new URLSearchParams()
          formData.append('username', credentials.email)
          formData.append('password', credentials.password || '')

          res = await fetch('/api/auth/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
          })
        }

        if (!res.ok) {
          return false
        }

        const data = await res.json()

        if (data.access_token) {
          document.cookie = `token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
          setToken(data.access_token) // 4. Сохраняем токен при успешном логине
        }

        setUser({
          name: credentials.name || credentials.email.split('@')[0],
          email: credentials.email,
        })
        setModalOpen(false)
        router.push('/account')
        return true
      } catch (e) {
        console.error('Сетевая ошибка авторизации:', e)
        return false
      }
    },
    [router],
  )

  const logout = useCallback(async () => {
    try {
      const savedToken = token || getCookie('token')
      if (savedToken) {
        await fetch('/api/auth/users/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${savedToken}` }
        })
      }
    } catch (e) {
      console.error('Ошибка при логауте', e)
    } finally {
      document.cookie = 'token=; path=/; max-age=0'
      setToken(null) // 5. Очищаем токен
      setUser(null)
      router.push('/')
    }
  }, [token, router])

  const requestAccount = useCallback(() => {
    if (user) {
      router.push('/account')
    } else {
      setModalOpen(true)
    }
  }, [user, router])

  const value = useMemo(
    () => ({
      user,
      token, // 6. Передаем в контекст
      isAuthed: Boolean(user),
      modalOpen,
      openModal,
      closeModal,
      requestAccount,
      login,
      logout,
    }),
    [user, token, modalOpen, openModal, closeModal, requestAccount, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}