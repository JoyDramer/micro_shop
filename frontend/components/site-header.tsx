'use client'

import { Menu, ShoppingCart, User, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useCart } from '@/components/cart-provider'

const navLinks = [
  { label: 'Каталог', href: '/#catalog' },
  { label: 'Хиты', href: '/#carousel' },
  { label: 'Аренда', href: '/rent' },
  { label: 'Доставка', href: '/info/dostavka-i-oplata' },
  { label: 'Контакты', href: '/info/kontakty' },
]

export function SiteHeader() {
  const { count } = useCart()
  const { requestAccount, isAuthed } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled || open
          ? 'border-b border-border/60 bg-background/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
        }`}
    >
      {/* Уменьшили высоту шапки на мобилках (h-20) и отступы (gap-2, px-3) */}
      <div className="mx-auto flex h-20 sm:h-28 max-w-[1400px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">

        {/* Left: hamburger + dropdown (Добавили shrink-0 для защиты от сжатия) */}
        <div ref={menuRef} className="relative flex flex-1 shrink-0 items-center">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex size-11 items-center justify-center rounded-md text-silver transition-colors hover:text-accent"
          >
            {open ? <X className="size-6" strokeWidth={1.75} /> : <Menu className="size-6" strokeWidth={1.75} />}
          </button>

          {open && (
            <div
              role="menu"
              className="absolute left-0 top-14 w-56 overflow-hidden rounded-xl border border-border/60 bg-background/95 p-1.5 shadow-2xl backdrop-blur-xl"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium tracking-wide text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Center: frameless white logo (Убрали shrink-0, разрешили сжиматься) */}
        <Link href="/" aria-label="MIKRO — на главную" className="flex shrink items-center justify-center min-w-0">
          <Image
            src="/images/logo-white.png"
            alt="MIKRO — интернет-магазин микронаушников №1"
            width={520}
            height={136}
            priority
            // Уменьшили высоту лого на мобилках до h-12, добавили object-contain и max-w
            className="h-12 sm:h-24 w-auto max-w-[50vw] sm:max-w-none object-contain opacity-95 transition-opacity hover:opacity-100"
          />
        </Link>

        {/* Right: profile + cart (Добавили shrink-0 для защиты кнопок от сжатия) */}
        <div className="flex flex-1 shrink-0 items-center justify-end gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={requestAccount}
            aria-label={isAuthed ? 'Личный кабинет' : 'Войти в личный кабинет'}
            className={`flex size-11 items-center justify-center rounded-md transition-colors hover:text-accent ${isAuthed ? 'text-accent' : 'text-silver'
              }`}
          >
            <User className="size-6" strokeWidth={1.75} />
          </button>
          <Link
            href="/cart"
            aria-label={`Корзина, товаров: ${count}`}
            className="relative flex size-11 items-center justify-center rounded-md text-silver transition-colors hover:text-accent"
          >
            <ShoppingCart className="size-6" strokeWidth={1.75} />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground tabular-nums">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}