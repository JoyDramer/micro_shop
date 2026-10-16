'use client'

import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { catalogCategories, formatPrice, productCategoryTags, productTypes, type Product } from '@/lib/products'
import { AddToCartButton } from '@/components/add-to-cart-button'

type FilterGroupProps = {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function FilterGroup({ title, children, defaultOpen = true }: FilterGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-300/70 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-sm font-semibold uppercase tracking-wide text-slate-700"
      >
        {title}
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-4 flex flex-col gap-3">{children}</div>}
    </div>
  )
}

const priceRanges = [
  { label: 'До 5 000 ₽', min: 0, max: 5000 },
  { label: '5 000 – 7 000 ₽', min: 5000, max: 7000 },
  { label: 'От 7 000 ₽', min: 7000, max: Infinity },
]

function ProductImageSlider({
  images,
  alt,
  productId,
  isBestseller
}: {
  images?: string[],
  alt: string,
  productId: number,
  isBestseller?: boolean
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const displayImages = images && images.length > 0 ? images : ['/placeholder.svg']

  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd

    if (distance > 50 || distance < -50) {
      e.preventDefault()
      e.stopPropagation()

      if (distance > 50) {
        setCurrentIndex((prev) => (prev + 1) % displayImages.length)
      } else {
        setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length)
      }
    }
    setTouchStart(0)
    setTouchEnd(0)
  }

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
    <div
      className="relative block aspect-square overflow-hidden bg-gradient-to-b from-white to-slate-100 group/slider touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isBestseller && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Хит
        </span>
      )}

      <Link href={`/product/${productId}`} className="absolute inset-0">
        <Image
          src={displayImages[currentIndex]}
          alt={`${alt} - фото ${currentIndex + 1}`}
          fill
          sizes="(min-width:1024px) 260px, (min-width:640px) 45vw, 90vw"
          className="object-contain p-6 transition duration-500 group-hover:scale-105 pointer-events-none"
        />
      </Link>

      {displayImages.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 z-10 flex size-8 md:size-auto -translate-y-1/2 items-center justify-center rounded-full bg-white/80 p-1 md:p-1.5 text-slate-700 opacity-100 md:opacity-0 shadow hover:bg-white transition-opacity group-hover/slider:opacity-100"
          >
            <ChevronLeft className="size-5 md:size-4" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 z-10 flex size-8 md:size-auto -translate-y-1/2 items-center justify-center rounded-full bg-white/80 p-1 md:p-1.5 text-slate-700 opacity-100 md:opacity-0 shadow hover:bg-white transition-opacity group-hover/slider:opacity-100"
          >
            <ChevronRight className="size-5 md:size-4" />
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {displayImages.map((_, idx) => (
              <div
                key={idx}
                className={`size-1.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-[#0f2f6b]' : 'bg-slate-300'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function CatalogSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [price, setPrice] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/products/products/')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error('Ошибка загрузки каталога:', err))
  }, [])

  const toggleCategory = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

  const toggleType = (t: string) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (
        query &&
        !`${p.name} ${p.description ?? ''}`.toLowerCase().includes(query.toLowerCase())
      )
        return false
      if (categories.length) {
        const tags = productCategoryTags(p)
        if (!categories.some((c) => tags.includes(c as (typeof tags)[number]))) return false
      }
      if (types.length && !types.includes(p.product_type)) return false
      if (price !== null) {
        const r = priceRanges[price]
        if (p.price < r.min || p.price >= r.max) return false
      }
      return true
    })
  }, [query, categories, types, price, products])

  return (
    <section id="catalog" className="bg-[#D0D0D0] py-20 text-slate-900">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-slate-500">
            Полный каталог
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Каталог микронаушников
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Filters */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24 rounded-xl bg-[#e2e2e2] p-5 shadow-sm ring-1 ring-black/5">
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск по каталогу"
                  aria-label="Поиск по каталогу"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
                />
              </div>

              <FilterGroup title="Категория">
                {catalogCategories.map((c) => (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={categories.includes(c)}
                      onChange={() => toggleCategory(c)}
                      className="size-4 accent-[#0f2f6b]"
                    />
                    {c}
                  </label>
                ))}
              </FilterGroup>

              <FilterGroup title="Тип">
                {productTypes.map((t) => (
                  <label
                    key={t}
                    className="flex cursor-pointer items-center gap-2.5 text-sm capitalize text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={types.includes(t)}
                      onChange={() => toggleType(t)}
                      className="size-4 accent-[#0f2f6b]"
                    />
                    {t}
                  </label>
                ))}
              </FilterGroup>

              <FilterGroup title="Цена">
                {priceRanges.map((r, i) => (
                  <label key={r.label} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="price"
                      checked={price === i}
                      onChange={() => setPrice(price === i ? null : i)}
                      onClick={() => price === i && setPrice(null)}
                      className="size-4 accent-[#0f2f6b]"
                    />
                    {r.label}
                  </label>
                ))}
              </FilterGroup>

              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setCategories([])
                  setTypes([])
                  setPrice(null)
                }}
                className="mt-4 w-full rounded-lg border border-slate-400 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
              >
                Сбросить фильтры
              </button>
            </div>
          </aside>

          {/* Grid */}
          <div className="lg:col-span-9">
            <p className="mb-5 text-sm text-slate-600">
              Найдено товаров: <span className="font-semibold text-slate-900">{filtered.length}</span>
            </p>
            {filtered.length === 0 ? (
              <div className="rounded-xl bg-[#e2e2e2] p-16 text-center text-slate-500">
                По выбранным фильтрам ничего не найдено.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <article
                    key={p.id}
                    className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <ProductImageSlider
                      images={p.images || (p.image_url ? [p.image_url] : undefined)}
                      alt={p.name}
                      productId={p.id}
                      isBestseller={p.is_bestseller}
                    />

                    <div className="flex flex-1 flex-col p-5">
                      <span className="mb-2 w-fit rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {p.product_type}
                      </span>
                      <Link href={`/product/${p.id}`} className="transition-colors hover:text-[#0f2f6b]">
                        <h3 className="font-display text-lg font-bold leading-tight">{p.name}</h3>
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm leading-snug text-slate-500">
                        {p.description}
                      </p>
                      <div className="mt-4 flex items-end justify-between pt-3">
                        <span className="text-xl font-bold">{formatPrice(p.price)}</span>

                        {/* ИСПОЛЬЗУЕМ НОВЫЙ КОМПОНЕНТ КНОПКИ */}
                        <AddToCartButton productId={p.id} productName={p.name} />

                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}