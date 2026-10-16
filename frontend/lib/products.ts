export interface Product {
  id: number
  name: string
  product_type: string
  category: string
  images?: string[]
  description?: string
  price: number
  stock: number
  reserved: number
  is_bestseller: boolean
}

export const productTypes = ['магнитные', 'капсульные'] as const

// Категории, которые используются для отрисовки чекбоксов в фильтрах
export const catalogCategories = ['Проводные', 'Беспроводные', 'Премиум', 'Аксессуары'] as const
export type CatalogCategory = (typeof catalogCategories)[number]

const PREMIUM_THRESHOLD = 6500

/** 
 * Функция классификации товара для фильтров каталога.
 * Связывает категорию из БД с визуальными фильтрами на сайте.
 */
export function productCategoryTags(p: Product): CatalogCategory[] {
  const tags: CatalogCategory[] = []

  // 1. Берем реальную категорию из БД и приводим к нижнему регистру
  const dbCategory = (p.category || '').toLowerCase()

  // 2. Назначаем теги в соответствии с фильтрами фронтенда
  if (dbCategory.includes('аксессуары')) tags.push('Аксессуары')
  if (dbCategory.includes('беспроводные')) tags.push('Беспроводные')
  if (dbCategory.includes('проводные')) tags.push('Проводные')
  if (dbCategory.includes('премиум')) tags.push('Премиум')

  // 3. Фолбэк: если категория пустая, определяем по типу товара
  if (tags.length === 0) {
    if (p.product_type === 'капсульные') tags.push('Беспроводные')
    else tags.push('Проводные')
  }

  // 4. Автоматически добавляем тег "Премиум" по цене, если его еще нет
  if (p.price >= PREMIUM_THRESHOLD && !tags.includes('Премиум')) {
    tags.push('Премиум')
  }

  return tags
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽'
}