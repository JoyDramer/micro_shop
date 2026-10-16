// Mock data layer for the rental feature (клиентская часть).
// Mirrors the shape returned by the future backend endpoints:
//   GET  /rent/catalog
//   GET  /rent/bookings?rental_product_id={id}
//   POST /rent/book

export interface RentalProduct {
  id: number
  name: string
  image_url: string
  description: string
  price_per_day: number
  /** Залог: сумма в рублях. Если null — принимается документ (паспорт). */
  deposit: number | null
}

export interface Booking {
  id: number
  rental_product_id: number
  start_date: string // ISO yyyy-mm-dd
  end_date: string // ISO yyyy-mm-dd
}

// GET /rent/catalog
export const rentalCatalog: RentalProduct[] = [
  {
    id: 1,
    name: 'Micro Nano — комплект',
    image_url: '/images/product-micro-earbud.png',
    description: 'Капсульный микронаушник 3 мм + Bluetooth-гарнитура. Идеален для экзамена.',
    price_per_day: 500,
    deposit: 2000,
  },
  {
    id: 2,
    name: 'Loop Classic — индукционный',
    image_url: '/images/loop-earpiece.jpg',
    description: 'Индукционная петля + магнитная капсула. Надёжная связь без проводов в ухе.',
    price_per_day: 450,
    deposit: 2000,
  },
  {
    id: 3,
    name: 'GSM Box — с обратной связью',
    image_url: '/images/product-gsm-box.png',
    description: 'GSM-модуль с SIM и микрофоном. Двусторонняя связь на любом расстоянии.',
    price_per_day: 800,
    deposit: null, // залог документом
  },
  {
    id: 4,
    name: 'Necklace Loop — скрытая петля',
    image_url: '/images/product-necklace-loop.png',
    description: 'Петля-ожерелье под одеждой + магнитный микронаушник. Полная незаметность.',
    price_per_day: 550,
    deposit: 2500,
  },
]

// GET /rent/bookings?rental_product_id={id}
// Занятые (чужие) брони по каждому товару — для блокировки дат в календаре.
const bookingsByProduct: Record<number, Booking[]> = {
  1: [
    { id: 101, rental_product_id: 1, start_date: dayFromNow(2), end_date: dayFromNow(5) },
    { id: 102, rental_product_id: 1, start_date: dayFromNow(12), end_date: dayFromNow(14) },
  ],
  2: [{ id: 103, rental_product_id: 2, start_date: dayFromNow(6), end_date: dayFromNow(9) }],
  3: [
    { id: 104, rental_product_id: 3, start_date: dayFromNow(1), end_date: dayFromNow(3) },
    { id: 105, rental_product_id: 3, start_date: dayFromNow(8), end_date: dayFromNow(10) },
    { id: 106, rental_product_id: 3, start_date: dayFromNow(20), end_date: dayFromNow(24) },
  ],
  4: [{ id: 107, rental_product_id: 4, start_date: dayFromNow(15), end_date: dayFromNow(18) }],
}

/** Имитация GET /rent/bookings — возвращает чужие брони для товара. */
export function getBookings(rentalProductId: number): Booking[] {
  return bookingsByProduct[rentalProductId] ?? []
}

/** Раскрывает диапазоны броней в плоский массив занятых дат (Date). */
export function bookedDatesFor(rentalProductId: number): Date[] {
  const dates: Date[] = []
  for (const b of getBookings(rentalProductId)) {
    const start = new Date(b.start_date)
    const end = new Date(b.end_date)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d))
    }
  }
  return dates
}

function dayFromNow(offset: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}
