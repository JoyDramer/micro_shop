import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CategoryGrid } from '@/components/category-grid'
import { PageShell } from '@/components/page-shell'
import { categoryMeta, categorySlugs } from '@/lib/site-pages'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = categorySlugs[slug]
  return { title: category ? `${category} — MIKRO` : 'MIKRO' }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = categorySlugs[slug]
  if (!category) notFound()

  const meta = categoryMeta[slug]
  
  // Делаем реальный запрос к нашему бэкенду
  let items = []
  try {
    const res = await fetch(`${process.env.INTERNAL_API_URL}/products/`, {
      cache: 'no-store' // Отключаем кэш, чтобы всегда получать актуальные товары
    })
    
    if (res.ok) {
      const allProducts = await res.json()
      // Фильтруем полученные товары по текущей категории
      items = allProducts.filter((p: any) => p.category === category)
    } else {
      console.error("Ошибка ответа API:", res.status)
    }
  } catch (error) {
    console.error("Ошибка подключения к product_service:", error)
  }

  return (
    <PageShell eyebrow={meta?.eyebrow ?? 'Каталог'} title={category} intro={meta?.intro}>
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <p className="mb-6 text-sm text-muted-foreground">
          Найдено товаров: <span className="font-semibold text-foreground">{items.length}</span>
        </p>
        <CategoryGrid items={items} />
      </section>
    </PageShell>
  )
}