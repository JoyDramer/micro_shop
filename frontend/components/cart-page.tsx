'use client'

import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/components/cart-provider'
import { useAuth } from '@/components/auth-provider'
import { formatPrice, type Product } from '@/lib/products'

export function CartPage() {
  const { items, fetchCart } = useCart()
  const { token } = useAuth() as any // Берем токен для авторизованных

  const [productsMap, setProductsMap] = useState<Record<number, Product>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Вспомогательная функция для заголовков (чтобы бэкенд нас узнал)
  const getHeaders = () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const sid = localStorage.getItem('guest_session_id')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    } else if (sid) {
      headers['X-Session-ID'] = sid
    }
    return headers
  }

  // 1. Загружаем детали товаров с бэкенда
  // 1. Загружаем детали конкретных товаров по их ID
  useEffect(() => {
    async function loadProductsData() {
      setIsLoading(true)
      try {
        const uniqueIds = items.map((i) => i.product_id)
        if (uniqueIds.length === 0) {
          setProductsMap({})
          setIsLoading(false)
          return
        }

        // Отправляем параллельные запросы для каждого ID товара
        const productPromises = uniqueIds.map((id) =>
          fetch(`/api/products/products/${id}`).then((res) => (res.ok ? res.json() : null))
        )

        // Ждем, пока загрузятся все нужные товары
        const productsData = await Promise.all(productPromises)

        const map: Record<number, Product> = {}
        productsData.forEach((p) => {
          if (p && p.id) {
            map[p.id] = p
          }
        })

        setProductsMap(map)
      } catch (error) {
        console.error('Ошибка при загрузке данных товаров для корзины:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProductsData()
  }, [items])

  // 2. Функция изменения количества через API корзины (ИСПРАВЛЕН ПУТЬ И МЕТОД)
  async function updateQuantity(productId: number, newQuantity: number) {
    setUpdatingId(productId)
    try {
      if (newQuantity <= 0) {
        await removeItem(productId)
        return
      }

      await fetch('/api/cart/update', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ product_id: productId, quantity: newQuantity }),
      })
      await fetchCart()
    } catch (error) {
      console.error('Ошибка обновления количества:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  // 3. Функция удаления товара через API (ИСПРАВЛЕН ПУТЬ И МЕТОД)
  async function removeItem(productId: number) {
    setUpdatingId(productId)
    try {
      await fetch('/api/cart/update', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ product_id: productId, quantity: 0 }),
      })
      await fetchCart()
    } catch (error) {
      console.error('Ошибка удаления товара:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  // Объединяем позиции корзины с реальными данными товаров
  const lineItems = useMemo(
    () =>
      items
        .map((item) => {
          const product = productsMap[item.product_id]
          return product ? { ...item, product } : null
        })
        .filter((v): v is { product_id: number; quantity: number; product: Product } => v !== null),
    [items, productsMap],
  )

  const totalCount = lineItems.reduce((sum, li) => sum + li.quantity, 0)
  const subtotal = lineItems.reduce((sum, li) => sum + li.product.price * li.quantity, 0)
  const isEmpty = items.length === 0

  return (
    <main className="min-h-screen bg-background pt-28 pb-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Корзина
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isEmpty
                ? 'Пока пусто — добавьте микронаушники из каталога.'
                : `${totalCount} ${totalCount === 1 ? 'товар' : totalCount < 5 ? 'товара' : 'товаров'} в корзине`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-10 flex items-center justify-center rounded-2xl bg-card p-12 text-center ring-1 ring-black/5">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Загрузка корзины...</span>
          </div>
        ) : isEmpty ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl bg-card px-6 py-20 text-center ring-1 ring-black/5">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <ShoppingBag className="size-7" strokeWidth={1.5} />
            </div>
            <p className="mt-5 text-lg font-medium text-foreground">Ваша корзина пуста</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Выберите подходящий комплект в каталоге — доставим по всей стране.
            </p>
            <Link href="/#catalog" className="mt-6">
              <Button>Перейти в каталог</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <section className="lg:col-span-8">
              <ul className="flex flex-col gap-4">
                {lineItems.map((li) => {
                  const isUpdating = updatingId === li.product_id
                  return (
                    <li
                      key={li.product_id}
                      className={`flex gap-4 rounded-2xl bg-card p-4 ring-1 ring-black/5 sm:gap-5 sm:p-5 transition-opacity ${isUpdating ? 'opacity-50' : 'opacity-100'
                        }`}
                    >
                      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-secondary sm:size-28">
                        <Image
                          src={li.product.images?.[0] || "/placeholder.svg"}
                          alt={li.product.name}
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-base font-semibold text-foreground sm:text-lg">
                              {li.product.name}
                            </h3>
                            <span className="mt-1 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs capitalize text-muted-foreground ring-1 ring-black/5">
                              {li.product.product_type}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(li.product_id)}
                            disabled={isUpdating}
                            aria-label={`Удалить ${li.product.name} из корзины`}
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-4.5" strokeWidth={1.75} />
                          </button>
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                          <div className="flex items-center rounded-lg bg-secondary ring-1 ring-black/5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(li.product_id, li.quantity - 1)}
                              disabled={isUpdating}
                              aria-label="Уменьшить количество"
                              className="flex size-9 items-center justify-center rounded-l-lg text-foreground transition-colors hover:bg-background hover:text-primary disabled:opacity-40"
                            >
                              <Minus className="size-4" strokeWidth={2} />
                            </button>
                            <span className="min-w-9 text-center text-sm font-semibold tabular-nums text-foreground">
                              {li.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(li.product_id, li.quantity + 1)}
                              disabled={isUpdating}
                              aria-label="Увеличить количество"
                              className="flex size-9 items-center justify-center rounded-r-lg text-foreground transition-colors hover:bg-background hover:text-primary disabled:opacity-40"
                            >
                              <Plus className="size-4" strokeWidth={2} />
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="font-sans text-base font-semibold tabular-nums text-foreground sm:text-lg">
                              {formatPrice(li.product.price * li.quantity)}
                            </p>
                            {li.quantity > 1 && (
                              <p className="text-xs text-muted-foreground">
                                {formatPrice(li.product.price)} × {li.quantity}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            <aside className="lg:col-span-4">
              <div className="sticky top-28 rounded-2xl bg-card p-6 ring-1 ring-black/5">
                <h2 className="font-display text-lg font-semibold text-foreground">Итого</h2>

                <dl className="mt-5 flex flex-col gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Товары ({totalCount})</dt>
                    <dd className="font-medium tabular-nums text-foreground">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Доставка</dt>
                    <dd className="font-medium text-primary">Бесплатно</dd>
                  </div>
                </dl>

                <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-5">
                  <span className="text-sm text-muted-foreground">К оплате</span>
                  <span className="font-sans text-2xl font-semibold tabular-nums text-foreground">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <Link href="/checkout" className="mt-6 block">
                  <Button size="lg" className="w-full gap-2 text-base">
                    Перейти к оформлению заказа
                    <ArrowRight className="size-5" strokeWidth={2} />
                  </Button>
                </Link>

                <ul className="mt-5 flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Truck className="size-4 text-primary" strokeWidth={1.75} />
                    Отправка в день заказа
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" strokeWidth={1.75} />
                    Гарантия и анонимная упаковка
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}