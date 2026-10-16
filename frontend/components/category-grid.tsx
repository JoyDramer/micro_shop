'use client'

import { ShoppingCart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/components/cart-provider'
import { formatPrice, type Product } from '@/lib/products'

export function CategoryGrid({ items }: { items: Product[] }) {
  const { add } = useCart()

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-16 text-center text-muted-foreground">
        В этой категории пока нет товаров. Загляните в{' '}
        <a href="/#catalog" className="text-accent underline-offset-4 hover:underline">
          полный каталог
        </a>
        .
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <article
          key={p.id}
          className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl"
        >
          <Link
            href={`/product/${p.id}`}
            className="relative block aspect-square overflow-hidden bg-secondary/40"
          >
            {p.is_bestseller && (
              <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                Хит
              </span>
            )}
            <Image
              src={p.image_url || '/placeholder.svg'}
              alt={p.name}
              fill
              sizes="(min-width:1024px) 300px, (min-width:640px) 45vw, 90vw"
              className="object-contain p-6 transition duration-500 group-hover:scale-105"
            />
          </Link>
          <div className="flex flex-1 flex-col p-5">
            <span className="mb-2 w-fit rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {p.product_type}
            </span>
            <Link href={`/product/${p.id}`} className="transition-colors hover:text-accent">
              <h3 className="font-display text-lg font-bold leading-tight text-foreground">{p.name}</h3>
            </Link>
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">{p.description}</p>
            <div className="mt-4 flex items-end justify-between pt-3">
              <span className="font-sans text-xl font-bold tabular-nums text-foreground">
                {formatPrice(p.price)}
              </span>
              <button
                type="button"
                onClick={() => add(p.id)}
                aria-label={`Добавить ${p.name} в корзину`}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <ShoppingCart className="size-4" />
                Купить
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
