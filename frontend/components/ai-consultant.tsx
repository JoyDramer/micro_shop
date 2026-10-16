'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const SUGGESTIONS = [
  'Какой микронаушник самый незаметный?',
  'Чем отличаются проводные и беспроводные?',
  'Что посоветуете для экзамена?',
]

export function AiConsultant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const busy = status === 'submitted' || status === 'streaming'

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open, busy])

  function submit(text: string) {
    const value = text.trim()
    if (!value || busy) return
    sendMessage({ text: value })
    setInput('')
  }

  return (
    <>
      {/* Кнопка открытия чата */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Закрыть чат с консультантом' : 'Открыть чат с ИИ-консультантом'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 ring-1 ring-primary/40 transition hover:scale-105 hover:shadow-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
          </span>
        )}
      </button>

      {/* Панель чата */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(560px,calc(100vh-8rem))] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-black/40">
          {/* Шапка чата */}
          <div className="flex items-center gap-3 border-b border-border bg-secondary/50 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">ИИ-консультант MIKRO</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                Онлайн, ответит за секунды
              </p>
            </div>
          </div>

          {/* Список сообщений */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                  Здравствуйте! Помогу подобрать микронаушник под вашу задачу и отвечу на вопросы о
                  доставке и гарантии. С чего начнём?
                </div>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => submit(s)}
                      className="rounded-xl border border-border px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap'
                      : 'max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap'
                  }
                >
                  {m.parts.map((part, index) =>
                    part.type === 'text' ? <span key={index}>{part.text}</span> : null
                  )}
                </div>
              </div>
            ))}

            {status === 'submitted' && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Печатает…
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                  Не удалось получить ответ. Консультант временно недоступен — попробуйте ещё раз чуть
                  позже или позвоните нам по телефону +7 (914) 893-89-99.
                </div>
              </div>
            )}
          </div>

          {/* Поле ввода */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(input)
            }}
            className="flex items-center gap-2 border-t border-border bg-card px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  submit(input)
                }
              }}
              placeholder="Напишите сообщение…"
              aria-label="Сообщение консультанту"
              className="h-11 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Отправить"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            </button>
          </form>
        </div>
      )}
    </>
  )
}