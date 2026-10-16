import type { Metadata } from 'next'
import { CheckoutPage } from '@/components/checkout-page'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Оформление заказа — MIKRO',
  description: 'Оформите заказ микронаушников с бесшовной регистрацией и бесплатной доставкой.',
}

export default function Checkout() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <CheckoutPage />
      <SiteFooter />
    </div>
  )
}
