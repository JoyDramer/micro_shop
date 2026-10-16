'use client'

import { ArrowDown } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export function HeroBanner() {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      raf = requestAnimationFrame(() => setOffset(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      aria-label="Главный баннер"
    >
      {/* Parallax background layer */}
      <div className="absolute inset-0 z-0" style={{ transform: `translateY(${offset * 0.35}px) scale(1.15)` }}>
        <Image
          src="/images/hero-classroom-raw.jpg"
          alt="Ночной город"
          fill
          priority
          className="object-cover"
        />
      </div>
      {/* Depth overlays — keep the night city visible, fade edges for legibility */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-gradient-to-b from-background/40 via-background/25 to-background"
      />
      <div aria-hidden className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,var(--background)_100%)]" />

      {/* Content grid */}
      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8">
        {/* Left product with hover glow */}
        <div
          className="group order-2 hidden justify-center lg:order-1 lg:col-span-3 lg:flex"
          style={{ transform: `translateY(${offset * -0.08}px)` }}
        >
          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-glow/40 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
            />
            <Image
              src="/images/earpiece-left-white.png"
              alt="Металлический микронаушник Silver Pro"
              width={360}
              height={360}
              className="relative w-full max-w-[230px] rotate-[-8deg] drop-shadow-[0_18px_40px_rgba(0,0,0,0.6)] transition duration-500 group-hover:drop-shadow-[0_0_40px_var(--glow)]"
            />
          </div>
        </div>

        {/* Center overlay block */}
        <div className="order-1 lg:order-2 lg:col-span-6">
          <div className="mx-auto max-w-xl rounded-2xl border border-border/50 bg-background/40 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
            <h1 className="text-balance font-display text-4xl font-extrabold uppercase leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Будь уверен
              <br />
              в <span className="text-primary">ответах</span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
              Незаметные беспроводные и индукционные микронаушники премиум-класса. Кристальный звук, надёжная связь и полная скрытность.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#catalog"
                className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_0_30px_-8px_var(--primary)] transition hover:brightness-110"
              >
                Купить
              </a>
              <a
                href="#carousel"
                className="inline-flex h-12 items-center justify-center rounded-md border border-border/70 px-8 text-sm font-semibold uppercase tracking-wide text-foreground transition hover:border-accent/70 hover:text-accent"
              >
                Хиты продаж
              </a>
            </div>
          </div>
        </div>

        {/* Right product with hover glow */}
        <div
          className="group order-3 hidden justify-center lg:col-span-3 lg:flex"
          style={{ transform: `translateY(${offset * -0.14}px)` }}
        >
          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-glow/40 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
            />
            <Image
              src="/images/earpiece-right-white.png"
              alt="Беспроводной микронаушник Micro Nano"
              width={360}
              height={360}
              className="relative w-full max-w-[230px] rotate-[8deg] drop-shadow-[0_18px_40px_rgba(0,0,0,0.6)] transition duration-500 group-hover:drop-shadow-[0_0_40px_var(--glow)]"
            />
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <a
        href="#carousel"
        aria-label="Прокрутить к товарам"
        className="absolute bottom-6 left-1/2 flex size-11 -translate-x-1/2 animate-bounce items-center justify-center rounded-full border border-border/70 bg-background/50 text-silver backdrop-blur transition hover:border-accent/60 hover:text-accent"
      >
        <ArrowDown className="size-5" />
      </a>
    </section>
  )
}
