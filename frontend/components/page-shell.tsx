import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export function PageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Title band */}
        <section className="relative overflow-hidden border-b border-border/60 pt-32 pb-14">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_60%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_60%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_60%,transparent)_1px,transparent_1px)] bg-[size:56px_56px] opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"
          />
          <div className="relative mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
            <nav aria-label="Хлебные крошки" className="mb-4 text-xs text-muted-foreground">
              <Link href="/" className="transition-colors hover:text-foreground">
                Главная
              </Link>
              <span className="mx-2 text-border">/</span>
              <span className="text-silver">{title}</span>
            </nav>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-primary">
              {eyebrow}
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground text-balance sm:text-5xl">
              {title}
            </h1>
            {intro && (
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
                {intro}
              </p>
            )}
          </div>
        </section>

        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
