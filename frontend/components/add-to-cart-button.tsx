'use client'

import { Plus, Minus, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '@/components/cart-provider'

export function AddToCartButton({ productId, productName }: { productId: number, productName: string }) {
  const { items, add, update } = useCart()
  const [isUpdating, setIsUpdating] = useState(false)

  const cartItem = items.find((item) => item.product_id === productId)
  const quantity = cartItem ? cartItem.quantity : 0

  const handleAction = async (e: React.MouseEvent, type: 'add' | 'update', newQuantity: number) => {
    e.preventDefault()
    e.stopPropagation()
    setIsUpdating(true)

    try {
      if (type === 'add') {
        await add(productId, 1)
      } else {
        // Передаем итоговое количество (например: было 2, передаем 3)
        // Если передадим 0, бэкенд удалит товар
        await update(productId, newQuantity)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  // Если товар уже в корзине — показываем счетчик (+/-)
  if (quantity > 0) {
    return (
      <div className={`flex h-[36px] items-center rounded-lg bg-slate-200 ring-1 ring-black/5 transition-opacity ${isUpdating ? 'opacity-50' : 'opacity-100'}`}>
        <button
          type="button"
          onClick={(e) => handleAction(e, 'update', quantity - 1)}
          disabled={isUpdating}
          aria-label="Уменьшить"
          className="flex h-full w-9 items-center justify-center rounded-l-lg text-slate-700 hover:bg-slate-300 transition-colors disabled:opacity-50"
        >
          <Minus className="size-4" strokeWidth={2} />
        </button>
        <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-slate-900">
          {isUpdating ? <Loader2 className="size-3 animate-spin mx-auto" /> : quantity}
        </span>
        <button
          type="button"
          onClick={(e) => handleAction(e, 'update', quantity + 1)}
          disabled={isUpdating}
          aria-label="Увеличить"
          className="flex h-full w-9 items-center justify-center rounded-r-lg text-slate-700 hover:bg-slate-300 transition-colors disabled:opacity-50"
        >
          <Plus className="size-4" strokeWidth={2} />
        </button>
      </div>
    )
  }

  // Если товара нет в корзине — кнопка "В корзину"
  return (
    <button
      type="button"
      onClick={(e) => handleAction(e, 'add', 1)}
      disabled={isUpdating}
      aria-label={`Добавить ${productName} в корзину`}
      className="flex items-center gap-1.5 rounded-lg bg-[#0f2f6b] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#163f8a] h-[36px] disabled:opacity-70"
    >
      {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      В корзину
    </button>
  )
}