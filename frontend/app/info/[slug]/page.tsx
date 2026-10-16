import { Check, Clock, Mail, MapPin, Phone, Star } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ContactForm } from '@/components/contact-form'
import { PageShell } from '@/components/page-shell'
import { infoPages } from '@/lib/site-pages'

const specialSlugs = ['kontakty', 'otzyvy'] as const

export function generateStaticParams() {
  return [...Object.keys(infoPages), ...specialSlugs].map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  if (slug === 'kontakty') return { title: 'Контакты — MIKRO' }
  if (slug === 'otzyvy') return { title: 'Отзывы — MIKRO' }
  const page = infoPages[slug]
  return { title: page ? `${page.title} — MIKRO` : 'MIKRO' }
}

const reviews = [
  {
    name: 'Андрей К.',
    role: 'Студент',
    rating: 5,
    text: 'Заказывал Micro Nano перед сессией. Реально не видно в ухе, звук чёткий. Доставили на следующий день.',
  },
  {
    name: 'Марина В.',
    role: 'Переводчик',
    rating: 5,
    text: 'Использую индукционный комплект на синхронных переводах. Петля прячется под воротником, связь стабильная.',
  },
  {
    name: 'Дмитрий С.',
    role: 'Ведущий мероприятий',
    rating: 4,
    text: 'GSM Box выручает на больших площадках — суфлёр подсказывает текст из другой комнаты. Батареи хватает надолго.',
  },
  {
    name: 'Ольга П.',
    role: 'Постоянный клиент',
    rating: 5,
    text: 'Второй заказ в этом магазине. Упаковка нейтральная, всё как обещали. Поддержка помогла с настройкой.',
  },
]

const contacts = [
  { icon: Phone, label: 'Телефон', value: '+7 (495) 123-45-67', href: 'tel:+74951234567' },
  { icon: Mail, label: 'E-mail', value: 'hello@mikro.shop', href: 'mailto:hello@mikro.shop' },
  { icon: MapPin, label: 'Адрес', value: 'Москва, ул. Тверская, 12' },
  { icon: Clock, label: 'Часы работы', value: 'Пн–Вс: 10:00 – 21:00' },
]

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Контакты
  if (slug === 'kontakty') {
    return (
      <PageShell
        eyebrow="Компания"
        title="Контакты"
        intro="Свяжитесь с нами удобным способом — поможем выбрать устройство и оформить заказ."
      >
        <section className="mx-auto max-w-[1000px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <ul className="flex flex-col gap-4">
                {contacts.map(({ icon: Icon, label, value, href }) => (
                  <li
                    key={label}
                    className="flex items-start gap-4 rounded-xl border border-border/60 bg-card p-5"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                      {href ? (
                        <a href={href} className="text-base font-medium text-foreground transition-colors hover:text-accent">
                          {value}
                        </a>
                      ) : (
                        <p className="text-base font-medium text-foreground">{value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <ContactForm />
          </div>
        </section>
      </PageShell>
    )
  }

  // Отзывы
  if (slug === 'otzyvy') {
    return (
      <PageShell
        eyebrow="Покупателям"
        title="Отзывы"
        intro="Более 40 000 клиентов доверяют MIKRO. Вот что говорят покупатели о наших устройствах."
      >
        <section className="mx-auto max-w-[1000px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {reviews.map((r) => (
              <article key={r.name} className="flex flex-col rounded-2xl border border-border/60 bg-card p-6">
                <div className="flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${i < r.rating ? 'fill-primary' : 'fill-none text-muted-foreground/40'}`}
                    />
                  ))}
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
                <div className="mt-5 border-t border-border/60 pt-4">
                  <p className="text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.role}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </PageShell>
    )
  }

  // Generic info pages
  const page = infoPages[slug]
  if (!page) notFound()

  return (
    <PageShell eyebrow={page.eyebrow} title={page.title} intro={page.intro}>
      <section className="mx-auto max-w-[800px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12">
          {page.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
                {section.heading}
              </h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="mt-3 text-base leading-relaxed text-muted-foreground text-pretty">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 flex flex-col gap-3">
                  {section.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3 text-base text-muted-foreground">
                      <Check className="mt-0.5 size-5 shrink-0 text-primary" />
                      <span className="leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
