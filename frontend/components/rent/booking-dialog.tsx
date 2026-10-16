'use client'

import { differenceInCalendarDays } from 'date-fns'
import { CalendarCheck, Loader2, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPrice } from '@/lib/products'
import { bookedDatesFor, type RentalProduct } from '@/lib/rent'

export function BookingDialog({
  product,
  city,
  open,
  onOpenChange,
}: {
  product: RentalProduct | null
  city: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [range, setRange] = useState<DateRange | undefined>()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  // Имитация GET /rent/bookings — занятые даты для выбранного товара.
  const bookedDates = useMemo(
    () => (product ? bookedDatesFor(product.id) : []),
    [product],
  )

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Кол-во суток аренды (включительно): 12→14 = 3 дня.
  const days =
    range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) + 1 : 0

  const rentTotal = product ? days * product.price_per_day : 0
  const depositTotal = product?.deposit ?? 0
  const total = rentTotal + depositTotal

  const contactValid = name.trim().length >= 2 && phone.trim().length >= 6
  const canSubmit = days >= 1 && contactValid && status !== 'loading'

  function reset() {
    setRange(undefined)
    setName('')
    setPhone('')
    setStatus('idle')
  }

  // POST /rent/book — имитация отправки брони.
  async function handleConfirm() {
    if (!product || !range?.from || !range?.to || !contactValid) return
    setStatus('loading')
    const payload = {
      rental_product_id: product.id,
      city,
      name: name.trim(),
      phone: phone.trim(),
      start_date: range.from.toISOString().slice(0, 10),
      end_date: range.to.toISOString().slice(0, 10),
    }
    console.log('[v0] POST /rent/book', payload)
    // Имитация сетевой задержки
    await new Promise((r) => setTimeout(r, 1200))
    setStatus('done')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setTimeout(reset, 200)
      }}
    >
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {product && status !== 'done' && (
          <>
            <DialogHeader className="border-b border-border/60 p-5 text-left">
              <DialogTitle className="font-display text-xl">Бронирование</DialogTitle>
              <DialogDescription>
                {product.name} · {formatPrice(product.price_per_day)}/сутки · г. {city}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 p-5">
              <Calendar
                mode="range"
                numberOfMonths={1}
                selected={range}
                onSelect={setRange}
                disabled={[{ before: today }, ...bookedDates]}
                className="rounded-lg border border-border/60 bg-card"
              />

              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block size-3 rounded-sm bg-muted opacity-60" />
                Серые даты уже забронированы и недоступны
              </p>

              {/* Контактные данные */}
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="rent-name">Имя</Label>
                  <Input
                    id="rent-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иван"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="rent-phone">Телефон</Label>
                  <Input
                    id="rent-phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 900 123-45-67"
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              {/* Динамический расчёт итога */}
              <dl className="w-full space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    Аренда {days > 0 ? `· ${days} ${plural(days)}` : ''}
                  </dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {formatPrice(rentTotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Залог</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {product.deposit === null ? 'Документ' : formatPrice(depositTotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <dt className="font-semibold text-foreground">К оплате при получении</dt>
                  <dd className="font-display text-lg font-semibold tabular-nums text-foreground">
                    {formatPrice(total)}
                  </dd>
                </div>
              </dl>

              <Button
                onClick={handleConfirm}
                disabled={!canSubmit}
                size="lg"
                className="w-full gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="size-5 animate-spin" strokeWidth={2} />
                    Отправляем бронь…
                  </>
                ) : (
                  <>
                    <CalendarCheck className="size-5" strokeWidth={2} />
                    Подтвердить бронь
                  </>
                )}
              </Button>
              <p className="flex items-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" strokeWidth={2} />
                Оплата и залог — при получении. Деньги на карте не блокируются.
              </p>
            </div>
          </>
        )}

        {product && status === 'done' && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <CalendarCheck className="size-7" strokeWidth={2} />
            </span>
            <DialogTitle className="font-display text-xl">Бронь оформлена!</DialogTitle>
            <DialogDescription className="text-pretty">
              Мы зарезервировали «{product.name}» на выбранные даты в городе {city}. Менеджер
              позвонит на {phone || 'указанный номер'} для подтверждения пункта выдачи.
            </DialogDescription>
            <Button variant="outline" className="mt-2 w-full" onClick={() => onOpenChange(false)}>
              Готово
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function plural(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'сутки'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'суток'
  return 'суток'
}
