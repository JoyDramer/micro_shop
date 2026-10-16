import { CartPage } from '@/components/cart-page'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export const metadata = {
  title: 'Корзина — MIKRO',
  description: 'Ваша корзина микронаушников MIKRO.',
}

export default function Cart() {
  return (
    <>
      <SiteHeader />
      <CartPage />
      <SiteFooter />
    </>
  )
}
