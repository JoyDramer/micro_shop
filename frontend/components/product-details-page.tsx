'use client'

import { Check, ChevronLeft, ChevronRight, Minus, Plus, ShieldCheck, ShoppingCart, Truck, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/components/cart-provider'
import { formatPrice, type Product } from '@/lib/products'

const benefits = [
  { icon: Truck, label: 'Быстрая доставка', note: 'По РФ за 1–3 дня' },
  { icon: ShieldCheck, label: 'Гарантия 1 год', note: 'Официальная гарантия' },
  { icon: Check, label: 'Безопасная оплата', note: 'Картой или при получении' },
]

// --- НОВЫЙ КОМПОНЕНТ СЛАЙДЕРА ДЛЯ СТРАНИЦЫ ТОВАРА ---
function ProductDetailsImageSlider({
  images,
  alt,
  isBestseller
}: {
  images?: string[],
  alt: string,
  isBestseller?: boolean
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const displayImages = images && images.length > 0 ? images : ['/placeholder.svg']

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % displayImages.length)
  }

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length)
  }

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-200 shadow-lg ring-1 ring-black/5 group/slider">
      {isBestseller && (
        <span className="absolute left-4 top-4 z-10 rounded-full bg-checkout px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-checkout-foreground shadow-md">
          Хит продаж
        </span>
      )}
      <Image
        src={displayImages[currentIndex]}
        alt={`${alt} - фото ${currentIndex + 1}`}
        fill
        priority
        sizes="(min-width:1024px) 560px, 90vw"
        className="object-contain p-10 transition duration-500"
      />

      {displayImages.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-700 opacity-0 shadow hover:bg-white transition-opacity group-hover/slider:opacity-100"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-700 opacity-0 shadow hover:bg-white transition-opacity group-hover/slider:opacity-100"
          >
            <ChevronRight className="size-6" />
          </button>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {displayImages.map((_, idx) => (
              <div
                key={idx}
                className={`size-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-[#0f2f6b]' : 'bg-slate-300'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function ProductDetailsPage({ product }: { product: Product }) {
  const { add } = useCart()
  const [qty, setQty] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const inStock = product.stock > 0

  const dec = () => setQty((v) => Math.max(1, v - 1))
  const inc = () => setQty((v) => Math.min(product.stock || 99, v + 1))

  const handleAdd = async () => {
    setIsAdding(true)
    try {
      await add(product.id, qty)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Breadcrumbs */}
      <nav aria-label="Хлебные крошки" className="mb-8 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Главная
        </Link>
        <span className="mx-2 text-border">/</span>
        <Link href="/#catalog" className="transition-colors hover:text-foreground">
          Каталог
        </Link>
        <span className="mx-2 text-border">/</span>
        <span className="text-muted-foreground">{product.category}</span>
        <span className="mx-2 text-border">/</span>
        <span className="text-silver">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: gallery */}
        <div>
          {/* ИСПОЛЬЗУЕМ НОВЫЙ СЛАЙДЕР */}
          <ProductDetailsImageSlider
            images={product.images || (product.image_url ? [product.image_url] : undefined)}
            alt={product.name}
            isBestseller={product.is_bestseller}
          />
        </div>

        {/* Right: info */}
        <div className="flex flex-col">
          <span className="mb-3 w-fit rounded-md bg-secondary px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {product.product_type}
          </span>

          <h1 className="font-display text-3xl font-bold leading-tight text-foreground text-balance sm:text-4xl">
            {product.name}
          </h1>

          <p className="mt-4 font-sans text-4xl font-bold tabular-nums text-foreground">
            {formatPrice(product.price)}
          </p>

          {/* Stock */}
          <div className="mt-4 flex items-center gap-2 text-sm font-medium">
            <span
              aria-hidden
              className={`size-2.5 rounded-full ${inStock ? 'bg-primary' : 'bg-destructive'}`}
            />
            <span className={inStock ? 'text-primary' : 'text-destructive'}>
              {inStock ? 'В наличии' : 'Нет в наличии'}
            </span>
          </div>

          {product.description && (
            <p className="mt-6 text-base leading-relaxed text-muted-foreground text-pretty">
              {product.description}
            </p>
          )}

          {/* Add to cart block */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-13 items-center rounded-xl border border-border bg-card">
              <button
                type="button"
                onClick={dec}
                disabled={qty <= 1 || isAdding}
                aria-label="Уменьшить количество"
                className="flex size-12 items-center justify-center rounded-l-xl text-muted-foreground transition hover:text-foreground disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span
                aria-live="polite"
                className="w-10 text-center text-lg font-semibold tabular-nums text-foreground"
              >
                {qty}
              </span>
              <button
                type="button"
                onClick={inc}
                disabled={!inStock || qty >= product.stock || isAdding}
                aria-label="Увеличить количество"
                className="flex size-12 items-center justify-center rounded-r-xl text-muted-foreground transition hover:text-foreground disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <Button
              size="lg"
              onClick={handleAdd}
              disabled={!inStock || isAdding}
              className="h-13 flex-1 gap-2 bg-checkout text-base text-checkout-foreground hover:bg-checkout-hover disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ShoppingCart className="size-5" />
              )}
              {isAdding ? 'Добавляем...' : 'Добавить в корзину'}
            </Button>
          </div>

          {/* Benefits */}
          <ul className="mt-8 grid grid-cols-1 gap-3 border-t border-border/60 pt-6 sm:grid-cols-3">
            {benefits.map((b) => (
              <li key={b.label} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-accent">
                  <b.icon className="size-4.5" strokeWidth={2} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{b.label}</span>
                  <span className="text-xs text-muted-foreground">{b.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}