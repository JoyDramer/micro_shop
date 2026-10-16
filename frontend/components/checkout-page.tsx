'use client'

import { Eye, EyeOff, Loader2, RefreshCw, UserCheck, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/components/cart-provider'
import { useAuth } from '@/components/auth-provider'
import { formatPrice, type Product } from '@/lib/products'
import { PochtaWidget } from '@/components/delivery/pochta-widget'
import { OzonWidget } from '@/components/delivery/ozon-widget'
import { CdekWidget } from '@/components/delivery/cdek-widget'

function generatePassword(length = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let out = ''
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function CheckoutPage() {
  const { items, fetchCart } = useCart()
  const { token, isAuthed, user } = useAuth() as any

  const [productsMap, setProductsMap] = useState<Record<number, Product>>({})

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleName, setMiddleName] = useState('')

  const [form, setForm] = useState({
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    password: generatePassword(),
  })

  // Стейт для выбора службы доставки (добавлен Ozon)
  const [deliveryType, setDeliveryType] = useState<'russian_post' | 'cdek' | 'ozon' | ''>('')

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [emailExists, setEmailExists] = useState<boolean | null>(null)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)

  // 1. АВТОЗАПОЛНЕНИЕ: Если пользователь залогинен, подтягиваем его профиль
  useEffect(() => {
    if (isAuthed && token) {
      fetch('/api/auth/users/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            if (data.first_name) setFirstName(data.first_name)
            if (data.last_name) setLastName(data.last_name)
            if (data.middle_name) setMiddleName(data.middle_name)
            if (data.phone_number) setForm(prev => ({ ...prev, phone: data.phone_number }))
            if (data.email) setForm(prev => ({ ...prev, email: data.email }))
          }
        })
        .catch(console.error)
    }
  }, [isAuthed, token])

  // Загрузка данных товаров
  useEffect(() => {
    async function loadProductsData() {
      const uniqueIds = items.map((i) => i.product_id)
      if (uniqueIds.length === 0) return
      try {
        const productPromises = uniqueIds.map((id) => fetch(`/api/products/products/${id}`).then((res) => (res.ok ? res.json() : null)))
        const productsData = await Promise.all(productPromises)
        const map: Record<number, Product> = {}
        productsData.forEach((p) => { if (p && p.id) map[p.id] = p })
        setProductsMap(map)
      } catch (error) {
        console.error('Ошибка загрузки данных товаров:', error)
      }
    }
    loadProductsData()
  }, [items])

  // Проверка существования Email
  useEffect(() => {
    if (isAuthed || !form.email || !form.email.includes('@')) {
      setEmailExists(null)
      return
    }
    const timer = setTimeout(async () => {
      setIsCheckingEmail(true)
      try {
        const res = await fetch(`/api/auth/users/check-email?email=${encodeURIComponent(form.email)}`)
        if (res.ok) {
          const data = await res.json()
          setEmailExists(data.exists)
          if (data.exists) setForm(prev => ({ ...prev, password: '' }))
        }
      } catch (err) { console.error('Ошибка проверки email', err) }
      finally { setIsCheckingEmail(false) }
    }, 500)
    return () => clearTimeout(timer)
  }, [form.email, isAuthed])

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Универсальный обработчик выбора адреса из виджетов
  const handleAddressSelect = (data: { address: string; postalCode: string }) => {
    updateField('address', data.address)
    updateField('postal_code', data.postalCode)
  }

  // Сброс адреса при смене службы доставки
  const handleDeliveryChange = (type: 'russian_post' | 'cdek' | 'ozon') => {
    setDeliveryType(type)
    updateField('address', '')
    updateField('postal_code', '')
  }

  const lineItems = useMemo(
    () => items.map((item) => {
      const product = productsMap[item.product_id]
      return product ? { ...item, product } : null
    }).filter((v): v is { product_id: number; quantity: number; product: Product } => v !== null),
    [items, productsMap],
  )

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = lineItems.reduce((sum, li) => sum + li.product.price * li.quantity, 0) // Итого без доставки
  const sid = typeof window !== 'undefined' ? localStorage.getItem('guest_session_id') : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      let currentToken = token

      // Логика входа или регистрации гостя
      if (!isAuthed || !currentToken) {
        if (emailExists) {
          const params = new URLSearchParams()
          params.append('username', form.email)
          params.append('password', form.password)

          const loginRes = await fetch('/api/auth/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          })

          if (!loginRes.ok) throw new Error('Неверный пароль от аккаунта')
          const data = await loginRes.json()
          currentToken = data.access_token
        } else {
          const registerRes = await fetch('/api/auth/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: form.email,
              password: form.password,
              name: `${firstName} ${lastName}`.trim(),
              phone_number: form.phone,
            }),
          })

          if (!registerRes.ok) throw new Error('Не удалось создать аккаунт')

          const params = new URLSearchParams()
          params.append('username', form.email)
          params.append('password', form.password)
          const loginRes = await fetch('/api/auth/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          })
          const data = await loginRes.json()
          currentToken = data.access_token
        }
      }

      if (!currentToken) throw new Error('Не удалось получить токен авторизации')

      // Обновляем данные пользователя в БД
      if (isAuthed || currentToken) {
        fetch('/api/auth/users/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName || null,
            phone_number: form.phone
          })
        }).catch(() => { })
      }

      // Отправляем заказ
      const checkoutRes = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
          ...(sid ? { 'X-Session-ID': sid } : {})
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName || null,
          phone: form.phone,
          address: form.address,
          postal_code: form.postal_code,
          delivery_provider: deliveryType
        }),
      })

      if (!checkoutRes.ok) {
        const errData = await checkoutRes.json().catch(() => null)
        const errorMsg = Array.isArray(errData?.detail) ? errData.detail.map((e: any) => `${e.loc.at(-1)}: ${e.msg}`).join(', ') : errData?.detail
        throw new Error(errorMsg || 'Ошибка при оформлении заказа в системе')
      }

      const order = await checkoutRes.json()

      // Готовим список товаров для чека (без доставки)
      const paymentItems = lineItems.map(li => ({
        name: li.product.name,
        price: li.product.price,
        quantity: li.quantity
      }))

      // Переходим к оплате
      const paymentRes = await fetch('/api/payment/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          order_id: order.id || order.order_id,
          amount: total,
          customer_email: form.email,
          items: paymentItems
        }),
      })

      if (!paymentRes.ok) throw new Error('Ошибка при инициализации платежа')

      const paymentData = await paymentRes.json()
      await fetchCart()

      if (paymentData.payment_url) {
        window.location.href = paymentData.payment_url
      } else {
        throw new Error('Банк не вернул ссылку на оплату')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так при оформлении')
      setIsLoading(false)
    }
  }

  // Кнопка оплаты заблокирована, пока не выбрана доставка и адрес
  const isFormValid = deliveryType !== '' && form.address !== '' && form.postal_code !== ''

  return (
    <main className="min-h-screen bg-background pt-28 pb-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Оформление заказа</h1>
            <p className="mt-2 text-sm text-muted-foreground">Заполните контактные данные — аккаунт создадим автоматически.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="lg:col-span-7">
            <div className="rounded-2xl bg-card p-6 ring-1 ring-black/5 sm:p-8">
              <h2 className="font-display text-lg font-semibold text-foreground">Контактные данные</h2>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label>ФИО получателя</Label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input placeholder="Фамилия *" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    <Input placeholder="Имя *" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <Input placeholder="Отчество (при наличии)" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="mt-2" />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+7 900 000-00-00" required />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="flex items-center justify-between">
                    <span>Email</span>
                    {isCheckingEmail && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                  </Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="you@example.com" required disabled={isAuthed} />
                </div>

                {/* Блок со способами доставки */}
                <fieldset className="flex flex-col gap-4 sm:col-span-2 mt-4 border-t border-border/60 pt-6">
                  <legend className="text-lg font-semibold text-foreground mb-2">Способ доставки</legend>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => handleDeliveryChange('russian_post')}
                      className={`p-4 border rounded-xl text-left transition-all ${deliveryType === 'russian_post' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'hover:border-border'
                        }`}
                    >
                      <span className="block font-semibold text-foreground">Почта России</span>
                      <span className="text-xs text-muted-foreground mt-1 block">Оплата при получении</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeliveryChange('cdek')}
                      className={`p-4 border rounded-xl text-left transition-all ${deliveryType === 'cdek' ? 'border-green-600 bg-green-50/50 ring-1 ring-green-600' : 'hover:border-border'
                        }`}
                    >
                      <span className="block font-semibold text-foreground">СДЭК</span>
                      <span className="text-xs text-muted-foreground mt-1 block">Оплата при получении</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeliveryChange('ozon')}
                      className={`p-4 border rounded-xl text-left transition-all ${deliveryType === 'ozon' ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'hover:border-border'
                        }`}
                    >
                      <span className="block font-semibold text-foreground">Ozon Доставка</span>
                      <span className="text-xs text-muted-foreground mt-1 block">Оплата при получении</span>
                    </button>
                  </div>

                  {/* Виджеты (рендерится только выбранный) */}
                  {deliveryType === 'russian_post' && (
                    <div className="mt-2 p-5 border border-blue-100 bg-card rounded-xl shadow-sm">
                      <PochtaWidget
                        onAddressSelect={handleAddressSelect}
                        selectedAddress={form.address} // <-- Добавили передачу адреса
                      />
                    </div>
                  )}

                  {deliveryType === 'ozon' && (
                    <div className="mt-2 p-5 border border-blue-100 bg-card rounded-xl shadow-sm">
                      <OzonWidget onAddressSelect={handleAddressSelect} />
                    </div>
                  )}

                  {deliveryType === 'cdek' && (
                    <div className="mt-2 p-5 border border-green-100 bg-card rounded-xl shadow-sm">
                      <CdekWidget onAddressSelect={handleAddressSelect} />
                    </div>
                  )}

                  {/* Отображение выбранного адреса */}
                  {(form.address || form.postal_code) && deliveryType !== '' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div className="md:col-span-2 flex flex-col gap-2">
                        <Label>Выбранный пункт выдачи</Label>
                        <Input value={form.address} readOnly className="bg-muted text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Индекс</Label>
                        <Input value={form.postal_code} readOnly className="bg-muted text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </fieldset>

                {/* Блок пароля для неавторизованных */}
                {!isAuthed && (
                  <div className="flex flex-col gap-2 sm:col-span-2 mt-4 border-t border-border/60 pt-6">
                    <Label htmlFor="password" className="flex items-center gap-1.5">
                      {emailExists ? (
                        <><UserCheck className="size-4 text-primary" /> Ваш аккаунт найден. Введите пароль</>
                      ) : (
                        <><UserPlus className="size-4 text-muted-foreground" /> Придумайте пароль (или оставьте сгенерированный)</>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => updateField('password', e.target.value)} required />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground">
                          {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                        </button>
                      </div>
                      {!emailExists && (
                        <Button type="button" variant="outline" size="icon" onClick={() => updateField('password', generatePassword())} className="size-10 shrink-0">
                          <RefreshCw className="size-4.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="lg:col-span-5">
            <div className="sticky top-28 rounded-2xl bg-card p-6 ring-1 ring-black/5">
              <h2 className="font-display text-lg font-semibold text-foreground">Ваш заказ</h2>
              <dl className="mt-5 flex flex-col gap-3 border-t border-border/60 pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Товары ({totalCount})</dt>
                  <dd className="font-medium">{formatPrice(total)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Доставка</dt>
                  <dd className="font-medium text-amber-600">Оплата при получении</dd>
                </div>
              </dl>
              <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-5">
                <span className="text-sm text-muted-foreground">Итого к оплате</span>
                <span className="font-sans text-2xl font-semibold">{formatPrice(total)}</span>
              </div>

              {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

              <Button type="submit" size="lg" disabled={isLoading || lineItems.length === 0 || !isFormValid} className="mt-6 w-full gap-2 bg-[#FFDD2D] text-base text-black hover:bg-[#FFDD2D]/90">
                {isLoading ? <><Loader2 className="size-5 animate-spin" /> Оформляем...</> : <>Оплатить · {formatPrice(total)}</>}
              </Button>
            </div>
          </aside>
        </form>
      </div>
    </main>
  )
}