'use client'

import { Package, Save, Settings, LogOut, KeyRound } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPrice } from '@/lib/products'

interface OrderItem {
  product_id: number
  quantity: number
  price_per_unit: number
  product_name: string
}

interface Order {
  id: number
  created_at: string
  // 1. ИСПРАВЛЕНИЕ: Используем русские статусы, как отдает бэкенд
  status: 'создан' | 'оплачен' | 'ждет отправки' | 'передан в доставку' | 'получен' | 'отменен'
  total_amount: number
  items: OrderItem[]
}

interface UserProfile {
  first_name: string
  last_name: string
  middle_name: string
  email: string
  phone: string
}

// 2. ИСПРАВЛЕНИЕ: Обновлены ключи объекта
const STATUS_META: Record<string, { label: string; className: string }> = {
  'создан': { label: 'Ожидает оплаты', className: 'border-amber-500/30 bg-amber-500/15 text-amber-300' },
  'оплачен': { label: 'Оплачен / В сборке', className: 'border-blue-500/30 bg-blue-500/15 text-blue-300' },
  'ждет отправки': { label: 'Ждет отправки', className: 'border-violet-500/30 bg-violet-500/15 text-violet-300' },
  'передан в доставку': { label: 'В пути', className: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300' },
  'получен': { label: 'Получен', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' },
  'отменен': { label: 'Отменен', className: 'border-red-500/30 bg-red-500/15 text-red-300' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function UserProfilePage() {
  const { user, isAuthed, logout, token } = useAuth() as any
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
  })

  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !isAuthed) {
      router.push('/')
    }
  }, [isClient, isAuthed, router])

  useEffect(() => {
    // 1. Быстрая подстановка базовых данных из сессии
    if (user) {
      setProfile((prev) => ({
        first_name: user.first_name || prev.first_name || '',
        last_name: user.last_name || prev.last_name || '',
        middle_name: user.middle_name || prev.middle_name || '',
        phone: user.phone_number || user.phone || prev.phone || '',
        email: user.email || prev.email || '',
      }))
    }

    // 2. Загрузка полных данных пользователя из бэкенда
    async function fetchUserProfile() {
      if (!token) return
      try {
        const res = await fetch('/api/auth/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (res.ok) {
          const data = await res.json()
          setProfile({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            middle_name: data.middle_name || '',
            phone: data.phone_number || data.phone || '',
            email: data.email || '',
          })
        }
      } catch (err) {
        console.error('Ошибка загрузки данных профиля:', err)
      }
    }

    if (token) {
      fetchUserProfile()
    }
  }, [user, token])

  const fetchOrders = useCallback(async () => {
    if (!token) return
    try {
      setIsLoadingOrders(true)
      const res = await fetch('/api/orders/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      } else if (res.status === 401) {
        console.warn('Токен не прошел проверку в сервисе заказов')
      }
    } catch (error) {
      console.error('Сетевая ошибка при загрузке заказов:', error)
    } finally {
      setIsLoadingOrders(false)
    }
  }, [token])

  useEffect(() => {
    if (isClient && isAuthed && token) {
      fetchOrders()
    }
  }, [isClient, isAuthed, token, fetchOrders])

  async function handleCancel(orderId: number) {
    if (!confirm("Вы уверены, что хотите отменить этот заказ? Бронь товаров будет снята.")) return

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        fetchOrders()
      } else {
        const data = await res.json()
        alert(data.detail || "Ошибка при отмене заказа")
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function handlePayment(order: Order) {
    try {
      const res = await fetch('/api/payment/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: order.id,
          amount: order.total_amount,
          customer_email: profile.email,
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.payment_url) {
          window.location.href = data.payment_url
        }
      } else {
        const errData = await res.json()
        alert(errData.detail || "Ошибка инициализации платежа")
      }
    } catch (error) {
      console.error("Ошибка сети при оплате:", error)
    }
  }

  function updateField(field: keyof UserProfile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setIsSaving(true)

    try {
      const res = await fetch('/api/auth/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          middle_name: profile.middle_name,
          phone_number: profile.phone,
        }),
      })

      if (res.ok) {
        setSaved(true)
        // Пытаемся прочитать обновленные данные из ответа
        const updated = await res.json().catch(() => null)

        if (updated) {
          // Обновляем состояние формы свежими данными с бэкенда
          setProfile({
            first_name: updated.first_name || profile.first_name,
            last_name: updated.last_name || profile.last_name,
            middle_name: updated.middle_name || profile.middle_name,
            phone: updated.phone_number || updated.phone || profile.phone,
            email: updated.email || profile.email,
          })
        }
      } else {
        console.error('Не удалось сохранить изменения, статус:', res.status)
      }
    } catch (err) {
      console.error('Ошибка при сохранении:', err)
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePasswordReset() {
    try {
      const res = await fetch('/api/auth/users/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email }),
      })
      if (res.ok) {
        setResetMsg('Письмо с инструкциями отправлено!')
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (!isClient || !isAuthed || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const displayName = profile.first_name || profile.email.split('@')[0]

  return (
    <main className="min-h-screen bg-background pt-28 pb-20">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Личный кабинет
            </h1>
            <p className="mt-2 text-muted-foreground">Здравствуйте, {displayName}</p>
          </div>
          <Button
            variant="outline"
            onClick={logout}
            className="gap-2 text-muted-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" strokeWidth={2} />
            Выйти
          </Button>
        </header>

        <Tabs defaultValue="orders" className="mt-8 gap-6">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-card p-1.5 ring-1 ring-border sm:w-auto">
            <TabsTrigger value="orders" className="gap-2 rounded-lg px-4 py-2 text-sm">
              <Package className="size-4" strokeWidth={2} />
              История заказов
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 rounded-lg px-4 py-2 text-sm">
              <Settings className="size-4" strokeWidth={2} />
              Настройки
            </TabsTrigger>
          </TabsList>

          {/* Вкладка Заказы */}
          <TabsContent value="orders" className="flex flex-col gap-5 mt-6">
            {isLoadingOrders ? (
              <div className="rounded-2xl bg-card p-10 text-center text-muted-foreground ring-1 ring-border">
                Загрузка истории заказов...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl bg-card p-10 text-center text-muted-foreground ring-1 ring-border">
                У вас пока нет оформленных заказов.
              </div>
            ) : (
              orders.map((order) => {
                const meta = STATUS_META[order.status] || {
                  label: order.status,
                  className: 'border-gray-500/30 bg-gray-500/15 text-gray-300',
                }

                return (
                  <article key={order.id} className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="font-display text-lg font-semibold text-foreground">№{order.id}</h2>
                          <Badge variant="outline" className={meta.className}>
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">от {formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Сумма</p>
                        <p className="font-sans text-xl font-semibold tabular-nums text-foreground">
                          {formatPrice(order.total_amount)}
                        </p>
                      </div>
                    </div>

                    <ul className="mt-4 flex flex-col gap-2.5">
                      {order.items.map((item) => (
                        <li key={item.product_id} className="flex items-center justify-between gap-4 text-sm">
                          <span className="min-w-0 flex-1 truncate text-foreground">{item.product_name}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {item.quantity} × {formatPrice(item.price_per_unit)}
                          </span>
                          <span className="w-24 shrink-0 text-right font-medium tabular-nums text-foreground">
                            {formatPrice(item.price_per_unit * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* 3. ИСПРАВЛЕНИЕ: Условие для рендера кнопок тоже на русском */}
                    {order.status === 'создан' && (
                      <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                        <Button
                          onClick={() => handlePayment(order)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Оплатить
                        </Button>
                        <Button
                          onClick={() => handleCancel(order.id)}
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 border-transparent hover:border-destructive hover:text-destructive"
                        >
                          Отменить заказ
                        </Button>
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </TabsContent>

          {/* Вкладка Настройки */}
          <TabsContent value="settings" className="mt-6 flex flex-col gap-6">
            <form onSubmit={handleSave} className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border sm:p-8">
              <h2 className="font-display text-lg font-semibold text-foreground">Настройки профиля</h2>
              <p className="mt-1 text-sm text-muted-foreground">Контактные данные для доставки и связи.</p>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-lastName">Фамилия</Label>
                  <Input
                    id="p-lastName"
                    value={profile.last_name}
                    onChange={(e) => updateField('last_name', e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-firstName">Имя</Label>
                  <Input
                    id="p-firstName"
                    value={profile.first_name}
                    onChange={(e) => updateField('first_name', e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="p-middleName">Отчество</Label>
                  <Input
                    id="p-middleName"
                    value={profile.middle_name}
                    onChange={(e) => updateField('middle_name', e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-phone">Телефон</Label>
                  <Input
                    id="p-phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="p-email">Email</Label>
                  <Input
                    id="p-email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-secondary/50 text-muted-foreground"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="gap-2 bg-checkout text-checkout-foreground hover:bg-checkout-hover"
                >
                  <Save className="size-4" strokeWidth={2} />
                  {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
                {saved && <span className="text-sm text-primary">Изменения сохранены</span>}
              </div>
            </form>

            <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border sm:p-8">
              <h2 className="font-display text-lg font-semibold text-foreground">Безопасность</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Если вы хотите изменить пароль, мы отправим ссылку для сброса на ваш Email.
              </p>

              <div className="mt-4 flex items-center gap-4">
                <Button type="button" variant="outline" onClick={handlePasswordReset} className="gap-2">
                  <KeyRound className="size-4" strokeWidth={2} />
                  Сменить пароль
                </Button>
                {resetMsg && <span className="text-sm text-primary">{resetMsg}</span>}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}