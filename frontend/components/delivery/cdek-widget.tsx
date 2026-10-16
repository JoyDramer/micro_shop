'use client'

import { useState } from 'react'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

// Расширяем глобальный объект Window для TypeScript
declare global {
  interface Window {
    CDEKWidget: any
  }
}

interface CdekWidgetProps {
  onAddressSelect: (data: { address: string; postalCode: string }) => void
}

export function CdekWidget({ onAddressSelect }: CdekWidgetProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

  const openWidget = () => {
    if (!isScriptLoaded || !window.CDEKWidget) {
      alert('Виджет СДЭК еще загружается, подождите пару секунд...')
      return
    }

    // Инициализация виджета СДЭК
    // Документация: https://widget.cdek.ru/
    const widget = new window.CDEKWidget({
      from: 'Москва', // Откуда отправляем (твой город отправки)
      root: false, // Открывать в модальном окне
      id: 'cdek-map', // ID элемента, если root: true, но при false он создаст модалку сам
      apiKey: 'твой_ключ_интеграции_сдэк', // Опционально, если есть тарифы
      onChoose: (type: string, tariff: any, address: any) => {
        console.log('Выбран ПВЗ СДЭК:', address)
        
        onAddressSelect({
          address: `ПВЗ СДЭК: ${address.name}, ${address.address}`,
          // СДЭК не всегда возвращает точный индекс ПВЗ в объекте address, 
          // но для ПВЗ он нам и не так критичен, как для Почты. 
          // Если его нет, можно передать дефолтный код города или оставить пустым
          postalCode: address.post_code || '000000' 
        })
        
        // Закрываем виджет после выбора
        widget.close()
      }
    })

    widget.open()
  }

  return (
    <>
      {/* Загружаем скрипт СДЭК */}
      <Script 
        src="https://widget.cdek.ru/widget/widjet.js" 
        strategy="lazyOnload"
        onLoad={() => setIsScriptLoaded(true)}
      />

      <Button 
        type="button" 
        variant="outline" 
        onClick={openWidget}
        className="w-full gap-2 border-green-600 text-green-700 hover:bg-green-50"
      >
        <MapPin className="size-4" />
        Выбрать пункт выдачи СДЭК
      </Button>
    </>
  )
}