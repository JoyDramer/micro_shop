'use client'

import {
  AlertTriangle,
  BatteryCharging,
  CalendarClock,
  FileText,
  GraduationCap,
  MapPin,
  PackageCheck,
  Undo2,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { BookingDialog } from '@/components/rent/booking-dialog'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/products'
import { rentalCatalog, type RentalProduct } from '@/lib/rent'

const steps = [
  {
    icon: CalendarClock,
    title: 'Оформляете бронь',
    text: 'Выбираете комплект и удобные даты в календаре.',
  },
  {
    icon: PackageCheck,
    title: 'Забираете',
    text: 'В пункте выдачи или у курьера — заряженным и готовым.',
  },
  {
    icon: GraduationCap,
    title: 'Сдаёте экзамен',
    text: 'Чистый звук и полная незаметность в нужный момент.',
  },
  {
    icon: Undo2,
    title: 'Возвращаете',
    text: 'Отдаёте комплект — залог возвращается сразу.',
  },
]

const faq = [
  {
    icon: FileText,
    q: 'Что нужно для аренды?',
    a: 'Паспорт для оформления договора аренды. Данные используются только для договора и нигде не публикуются.',
  },
  {
    icon: BatteryCharging,
    q: 'В каком состоянии выдаётся комплект?',
    a: 'Полностью заряженным, проверенным и в идеальном состоянии. В комплекте — запасные вкладыши и кабель для зарядки.',
  },
  {
    icon: AlertTriangle,
    q: 'Что будет при поломке или утере?',
    a: 'При повреждении или утере устройства удерживается залог согласно договору. Естественный износ платой не облагается.',
  },
  {
    icon: CalendarClock,
    q: 'Можно ли продлить аренду?',
    a: 'Да, если даты не заняты другой бронью. Напишите нам — продлим в пару кликов.',
  },
]

const cities = ['Москва', 'Иркутск'] as const

export function RentPage() {
  const [active, setActive] = useState<RentalProduct | null>(null)
  const [open, setOpen] = useState(false)
  const [city, setCity] = useState<(typeof cities)[number]>('Москва')

  function book(product: RentalProduct) {
    setActive(product)
    setOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60 pt-36 pb-16">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_24%,transparent),transparent_62%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_60%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_60%,transparent)_1px,transparent_1px)] bg-[size:56px_56px] opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"
          />
          <div className="relative mx-auto max-w-[1000px] px-4 text-center sm:px-6 lg:px-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-primary">
              Аренда посуточно
            </p>
            <h1 className="text-balance font-display text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Аренда микронаушников
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Идеальное состояние, полная комплектация и абсолютная анонимность. Возьмите
              профессиональный комплект только на те дни, когда он действительно нужен.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center font-display text-2xl font-bold text-foreground sm:text-3xl">
            Как это работает
          </h2>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="relative flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-black/5"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <step.icon className="size-5" strokeWidth={2} />
                </span>
                <span className="absolute right-5 top-5 font-display text-3xl font-bold text-border">
                  {i + 1}
                </span>
                <h3 className="font-display text-base font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Rent catalog */}
        <section className="border-t border-border/60 bg-secondary/30">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="mb-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
                  Доступные комплекты
                </h2>
                <p className="text-sm text-muted-foreground">
                  Выберите город, комплект и забронируйте на нужные даты.
                </p>
              </div>

              {/* Выбор города */}
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <MapPin className="size-3.5" strokeWidth={2} />
                  Город получения
                </span>
                <div
                  role="radiogroup"
                  aria-label="Город получения"
                  className="inline-flex rounded-xl bg-secondary/60 p-1 ring-1 ring-black/5"
                >
                  {cities.map((c) => {
                    const activeCity = city === c
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={activeCity}
                        onClick={() => setCity(c)}
                        className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
                          activeCity
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {rentalCatalog.map((product) => (
                <article
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-black/5 transition hover:ring-primary/30"
                >
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-background to-secondary/40">
                    <Image
                      src={product.image_url || '/placeholder.svg'}
                      alt={product.name}
                      fill
                      sizes="(min-width:1024px) 270px, (min-width:640px) 45vw, 90vw"
                      className="object-contain p-6 transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-base font-bold leading-tight text-foreground">
                      {product.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-snug text-muted-foreground">
                      {product.description}
                    </p>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="font-display text-xl font-bold text-foreground">
                        {formatPrice(product.price_per_day)}
                      </span>
                      <span className="text-sm text-muted-foreground">/ сутки</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Залог:{' '}
                      <span className="font-medium text-foreground">
                        {product.deposit === null ? 'документ' : formatPrice(product.deposit)}
                      </span>
                    </p>
                    <Button onClick={() => book(product)} className="mt-4 w-full gap-2">
                      <CalendarClock className="size-4" strokeWidth={2} />
                      Выбрать даты
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ / rules */}
        <section className="mx-auto max-w-[1000px] px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center font-display text-2xl font-bold text-foreground sm:text-3xl">
            Правила аренды
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {faq.map((item) => (
              <div key={item.q} className="flex gap-4 rounded-2xl bg-card p-6 ring-1 ring-black/5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <item.icon className="size-5" strokeWidth={2} />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{item.q}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />

      <BookingDialog product={active} city={city} open={open} onOpenChange={setOpen} />
    </div>
  )
}
