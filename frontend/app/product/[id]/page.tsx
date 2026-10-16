import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetailsPage } from '@/components/product-details-page'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { formatPrice, type Product } from '@/lib/products'

// 1. Отключаем статическую генерацию, чтобы не было ошибок при сборке Docker
export const dynamic = 'force-dynamic' 

// 2. Стучимся НАПРЯМУЮ в контейнер product_service, минуя Nginx!
const PRODUCT_SERVICE_URL = 'http://product_service:8000/products'

// Функция загрузки одного товара с бэкенда
async function fetchProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${PRODUCT_SERVICE_URL}/${id}`, {
      cache: 'no-store' // Отключаем кеш, чтобы всегда получать свежие данные
    })
    
    if (!res.ok) {
      console.error(`Бэкенд ответил статусом: ${res.status}`)
      return null
    }
    
    return res.json()
  } catch (error) {
    console.error(`Ошибка при загрузке товара ${id}:`, error)
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const product = await fetchProduct(id)
  
  if (!product) return { title: 'Товар не найден — MIKRO' }
  
  return {
    title: `${product.name} — ${formatPrice(product.price)} | MIKRO`,
    description: product.description,
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await fetchProduct(id)
  
  if (!product) notFound()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-24">
        <ProductDetailsPage product={product} />
      </main>
      <SiteFooter />
    </div>
  )
}