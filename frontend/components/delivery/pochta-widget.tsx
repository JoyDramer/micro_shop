'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { MapPin, X } from 'lucide-react' // Добавили иконку X

declare global {
  interface Window {
    ecomStartWidget: any
    pochtaDeliveryCallback: (data: any) => void
    resetSelectedPlacemarkInEcomWidget: () => void // Функция для сброса ПВЗ
  }
}

interface PochtaWidgetProps {
  onAddressSelect: (data: { address: string; postalCode: string }) => void
  selectedAddress?: string // Добавили пропс для проверки, выбран ли уже адрес
}

export function PochtaWidget({ onAddressSelect, selectedAddress }: PochtaWidgetProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [isWidgetVisible, setIsWidgetVisible] = useState(false)

  useEffect(() => {
    window.pochtaDeliveryCallback = function (data: any) {
      const fullAddress = data.addressTo || data.address || ''
      const zipCode = data.indexTo || data.index || ''

      onAddressSelect({
        address: fullAddress,
        postalCode: zipCode
      })

      setIsWidgetVisible(false)
    }

    return () => {
      // @ts-ignore
      delete window.pochtaDeliveryCallback
    }
  }, [onAddressSelect])

  const openWidget = () => {
    if (!isScriptLoaded || typeof window.ecomStartWidget !== 'function') {
      alert('Виджет Почты России еще загружается, подождите пару секунд...')
      return
    }

    setIsWidgetVisible(true)

    setTimeout(() => {
      window.ecomStartWidget({
        id: 63390,
        callbackFunction: window.pochtaDeliveryCallback,
        containerId: 'ecom-widget'
      })
    }, 100)
  }

  // Функция для сброса выбранного ПВЗ
  const resetWidget = () => {
    if (typeof window.resetSelectedPlacemarkInEcomWidget === 'function') {
      window.resetSelectedPlacemarkInEcomWidget()
    }
    // Очищаем адрес в родительской форме
    onAddressSelect({ address: '', postalCode: '' })
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <Script
        src="https://widget.pochta.ru/map/widget/widget.js"
        strategy="lazyOnload"
        onLoad={() => setIsScriptLoaded(true)}
      />

      {!isWidgetVisible && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={openWidget}
            className="flex-1 gap-2 border-blue-600 text-blue-700 hover:bg-blue-50"
          >
            <MapPin className="size-4" />
            {selectedAddress ? 'Изменить отделение на карте' : 'Выбрать отделение Почты России'}
          </Button>

          {/* Показываем кнопку сброса только если адрес уже выбран */}
          {selectedAddress && (
            <Button
              type="button"
              variant="outline"
              onClick={resetWidget}
              className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/30"
              title="Сбросить выбранный ПВЗ"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}

      <div
        id="ecom-widget"
        className="w-full overflow-hidden rounded-xl border border-border"
        style={{
          height: isWidgetVisible ? '500px' : '0',
          display: isWidgetVisible ? 'block' : 'none'
        }}
      />
    </div>
  )
}