import { CreditCard, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { footerHrefs } from '@/lib/site-pages'

const columns = [
  {
    title: 'Каталог',
    links: ['Беспроводные', 'Индукционные', 'GSM-комплекты', 'Аксессуары'],
  },
  {
    title: 'Покупателям',
    links: ['Доставка и оплата', 'Гарантия', 'Отзывы'],
  },
  {
    title: 'Компания',
    links: ['О магазине', 'Контакты', 'Оптовикам', 'Политика конфиденциальности'],
  },
]

export function SiteFooter() {
  return (
    <footer id="footer" className="border-t border-border/60 bg-[#0a0b0f] text-foreground">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand + contacts */}
          <div className="lg:col-span-4">
            <Link href="/" aria-label="MIKRO — на главную" className="inline-flex">
              <Image
                src="/images/logo-white.png"
                alt="MIKRO — интернет-магазин микронаушников №1"
                width={420}
                height={110}
                className="h-16 w-auto opacity-95 transition-opacity hover:opacity-100"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Интернет-магазин микронаушников №1. Незаметность, чистота звука и мощность в каждом устройстве.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li>
                <a href="tel:+74951234567" className="flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground">
                  <Phone className="size-4 text-silver" />
                  +7 (495) 123-45-67
                </a>
              </li>
              <li>
                <a href="mailto:hello@mikro.shop" className="flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground">
                  <Mail className="size-4 text-silver" />
                  hello@mikro.shop
                </a>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="size-4 text-silver" />
                Москва, ул. Тверская, 12
              </li>
            </ul>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      href={footerHrefs[link] ?? '#'}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Social */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
              Мы на связи
            </h3>
            <div className="flex gap-2">
              {[
                { icon: Send, label: 'Telegram' },
                { icon: MessageCircle, label: 'WhatsApp' },
                { icon: Phone, label: 'Позвонить' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex size-10 items-center justify-center rounded-md border border-border/70 text-silver transition-colors hover:border-accent/60 hover:text-accent"
                >
                  <Icon className="size-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MIKRO. Все права защищены.
          </p>
          <div className="flex items-center gap-2 text-silver">
            <CreditCard className="size-6" />
            <span className="rounded-md border border-border/60 px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground">
              VISA
            </span>
            <span className="rounded-md border border-border/60 px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground">
              MASTERCARD
            </span>
            <span className="rounded-md border border-border/60 px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground">
              МИР
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
