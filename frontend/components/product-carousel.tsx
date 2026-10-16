'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState, useEffect } from 'react'
import { formatPrice, type Product } from '@/lib/products'
import { AddToCartButton } from '@/components/add-to-cart-button'

// --- ОБНОВЛЕННЫЙ КОМПОНЕНТ СЛАЙДЕРА ДЛЯ КАРУСЕЛИ (СО СВАЙПАМИ) ---
function CarouselImageSlider({
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

  // --- ЛОГИКА СВАЙПОВ ---
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

    // Если провели пальцем больше чем на 50 пикселей
    if (distance > 50 || distance < -50) {
      e.preventDefault() // Отменяем случайный переход по ссылке
      e.stopPropagation()

      if (distance > 50) {
        // Свайп влево
        setCurrentIndex((prev) => (prev + 1) % displayImages.length)
      } else {
        // Свайп вправо
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
      className="relative aspect-square overflow-hidden bg-white group/slider touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isBestseller && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Хит
        </span>
      )}
      <Image
        src={displayImages[currentIndex]}
        alt={`${alt} - фото ${currentIndex + 1}`}
        fill
        sizes="270px"
        // pointer-events-none нужен, чтобы картинка не перехватывала касания
        className="object-contain p-6 transition duration-500 group-hover:scale-105 pointer-events-none"
      />

      {displayImages.length > 1 && (
        <>
          {/* opacity-100 md:opacity-0: Видно на телефонах всегда, на ПК - только при наведении */}
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 z-20 flex size-8 md:size-auto -translate-y-1/2 items-center justify-center rounded-full bg-white/80 p-1 md:p-1.5 text-slate-700 opacity-100 md:opacity-0 shadow hover:bg-white transition-opacity group-hover/slider:opacity-100"
          >
            <ChevronLeft className="size-5 md:size-4" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 z-20 flex size-8 md:size-auto -translate-y-1/2 items-center justify-center rounded-full bg-white/80 p-1 md:p-1.5 text-slate-700 opacity-100 md:opacity-0 shadow hover:bg-white transition-opacity group-hover/slider:opacity-100"
          >
            <ChevronRight className="size-5 md:size-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
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

export function ProductCarousel() {
  const scroller = useRef<HTMLDivElement>(null)

  const [bestsellers, setBestsellers] = useState<Product[]>([])

  useEffect(() => {
    fetch('/api/products/products/')
      .then((res) => res.json())
      .then((data) => {
        setBestsellers(data.filter((p: Product) => p.is_bestseller))
      })
      .catch((err) => console.error('Ошибка загрузки хитов:', err))
  }, [])

  const scrollBy = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <section
      id="carousel"
      className="relative bg-emerald-deep py-20"
      style={{ backgroundColor: '#0B3A1C' }}
      aria-label="Популярные микронаушники"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-emerald-100/70">
              Выбор покупателей
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Хиты продаж
            </h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Предыдущие товары"
              className="flex size-11 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Следующие товары"
              className="flex size-11 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        <div
          ref={scroller}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {bestsellers.map((p) => (
            <article
              key={p.id}
              className="group flex w-[270px] shrink-0 snap-start flex-col overflow-hidden rounded-xl bg-gradient-to-b from-[#e9edf0] to-[#c9d0d6] text-slate-900 shadow-xl ring-1 ring-black/5"
            >
              {/* === КЛИКАБЕЛЬНАЯ ЧАСТЬ КАРТОЧКИ === */}
              <Link href={`/product/${p.id}`} className="flex flex-1 flex-col outline-none relative">
                <CarouselImageSlider
                  images={p.images || (p.image_url ? [p.image_url] : undefined)}
                  alt={p.name}
                  isBestseller={p.is_bestseller}
                />
                <div className="flex flex-col px-5 pt-5 pb-2">
                  <h3 className="font-display text-lg font-bold leading-tight transition-colors group-hover:text-[#0f2f6b]">
                    {p.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-slate-500">
                    {p.description}
                  </p>
                </div>
              </Link>

              {/* === ФУНКЦИОНАЛЬНАЯ ЧАСТЬ (ЦЕНА И КНОПКА КОРЗИНЫ) === */}
              <div className="mt-auto flex items-end justify-between px-5 pb-5 pt-2">
                <span className="text-lg font-bold">{formatPrice(p.price)}</span>

                {/* ИСПОЛЬЗУЕМ НОВЫЙ КОМПОНЕНТ КНОПКИ */}
                <AddToCartButton productId={p.id} productName={p.name} />

              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}