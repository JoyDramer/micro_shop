'use client'

import { Check, Send } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ContactForm() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-6" />
        </span>
        <h3 className="mt-4 font-display text-xl font-semibold text-foreground">Заявка отправлена</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Спасибо, {name || 'друг'}! Мы свяжемся с вами в ближайшее время.
        </p>
      </div>
    )
  }

  const field =
    'h-12 w-full rounded-lg border border-input bg-secondary/40 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring'

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
      <h3 className="font-display text-xl font-semibold text-foreground">Напишите нам</h3>
      <p className="mt-1 text-sm text-muted-foreground">Ответим в течение рабочего дня.</p>
      <div className="mt-6 flex flex-col gap-4">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ваше имя"
          aria-label="Ваше имя"
          className={field}
        />
        <input
          type="text"
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Телефон или e-mail"
          aria-label="Телефон или e-mail"
          className={field}
        />
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Сообщение"
          aria-label="Сообщение"
          rows={4}
          className="w-full resize-none rounded-lg border border-input bg-secondary/40 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
        />
        <Button type="submit" className="h-12 w-full gap-2 font-semibold">
          <Send className="size-4" />
          Отправить заявку
        </Button>
      </div>
    </form>
  )
}
