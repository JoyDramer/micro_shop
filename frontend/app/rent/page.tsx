import type { Metadata } from 'next'
import { RentPage } from '@/components/rent/rent-page'

export const metadata: Metadata = {
  title: 'Аренда микронаушников посуточно — MIKRO',
  description:
    'Аренда профессиональных микронаушников посуточно: идеальное состояние, полная комплектация, полная анонимность. Онлайн-бронирование дат.',
}

export default function Page() {
  return <RentPage />
}
