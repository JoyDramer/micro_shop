'use client'

import { useState } from 'react'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

interface OzonWidgetProps {
  onAddressSelect: (data: { address: string; postalCode: string }) => void
}

export function OzonWidget({ onAddressSelect }: OzonWidgetProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

  const openWidget = () => {
    if (!isScriptLoaded) {
      alert('Виджет Ozon еще загружается...')
      return
    }

    // Здесь будет реальная инициализация виджета Ozon.
    // У Ozon есть свой JS API, куда передаются параметры.
    // Для примера оставим мок-данные, пока ты не вставишь ключ от ЛК Ozon.
    console.log('Открываем виджет Ozon...')

    // Имитация выбора ПВЗ клиентом
    setTimeout(() => {
      onAddressSelect({
        address: 'ПВЗ Ozon: г. Москва, ул. Тверская, д. 1',
        postalCode: '125009'
      })
    }, 1000)
  }

  return (
    <>
      {/* Сюда вставляется реальный URL скрипта виджета Ozon */}
      <Script
        src="https://cdn.ozon.ru/widget/delivery.js" // Пример URL, замени на актуальный из документации
        strategy="lazyOnload"
        onLoad={() => setIsScriptLoaded(true)}
      />

      <Button
        type="button"
        variant="outline"
        onClick={openWidget}
        className="w-full gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
      >
        <MapPin className="size-4" />
        Выбрать пункт выдачи Ozon
      </Button>
    </>
  )
}