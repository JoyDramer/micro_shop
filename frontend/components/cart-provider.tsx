'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'

interface CartItem {
  product_id: number
  quantity: number
}

type CartContextValue = {
  count: number
  items: CartItem[]
  add: (id: number, quantity?: number) => Promise<void>
  update: (id: number, quantity: number) => Promise<void> // <-- ДОБАВИЛИ В ТИПЫ
  fetchCart: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthed } = useAuth() as any
  
  const [items, setItems] = useState<CartItem[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    let sid = localStorage.getItem('guest_session_id')
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 15)
      localStorage.setItem('guest_session_id', sid)
    }
    setSessionId(sid)
  }, [])

  const getHeaders = useCallback(() => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (isAuthed && token) {
      headers['Authorization'] = `Bearer ${token}`
    } else if (sessionId) {
      headers['X-Session-ID'] = sessionId
    }
    return headers
  }, [isAuthed, token, sessionId])

  const fetchCart = useCallback(async () => {
    if (!sessionId && !isAuthed) return 
    try {
      const res = await fetch('/api/cart/', { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Ошибка загрузки корзины:', error)
    }
  }, [getHeaders, sessionId, isAuthed])

  useEffect(() => {
    if (sessionId) fetchCart()
  }, [fetchCart, sessionId])

  const add = useCallback(async (id: number, quantity: number = 1) => {
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ product_id: id, quantity })
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Ошибка добавления:', error)
    }
  }, [getHeaders])

  // <-- НОВАЯ ФУНКЦИЯ ДЛЯ ПЛЮСА И МИНУСА -->
  const update = useCallback(async (id: number, quantity: number) => {
    try {
      const res = await fetch('/api/cart/update', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ product_id: id, quantity })
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Ошибка обновления:', error)
    }
  }, [getHeaders])

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const value = useMemo(() => ({ count, items, add, update, fetchCart }), [count, items, add, update, fetchCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}