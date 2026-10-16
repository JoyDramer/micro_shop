import { AiConsultant } from '@/components/ai-consultant'
import { CatalogSection } from '@/components/catalog-section'
import { HeroBanner } from '@/components/hero-banner'
import { ProductCarousel } from '@/components/product-carousel'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <HeroBanner />
        <ProductCarousel />
        <CatalogSection />
      </main>
      <SiteFooter />
      <AiConsultant />
    </div>
  )
}
