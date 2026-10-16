import { streamText, convertToModelMessages } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

// Инициализируем OpenAI клиент с указанием российского зеркала
const proxyAi = createOpenAI({
  baseURL: 'https://api.proxyapi.ru/openai/v1',
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  let catalogSummary = 'Каталог временно недоступен.'
  try {
    // Запрашиваем каталог по публичному домену с валидным SSL-сертификатом
    const res = await fetch('https://xn--80apbahcjkbhv3b3d.xn--p1ai/api/products/products/', {
      cache: 'no-store',
    })

    if (res.ok) {
      const products = await res.json()
      if (Array.isArray(products) && products.length > 0) {
        catalogSummary = products
          .map(
            (p: any) =>
              `- ${p.name}: ${p.price} ₽. ${p.description ?? ''}`.trim()
          )
          .join('\n')
      } else {
        catalogSummary = 'Каталог пуст.'
      }
    } else {
      console.error('Ошибка ответа сервера каталога:', res.status)
    }
  } catch (error) {
    console.error('Ошибка загрузки товаров для ИИ-чата:', error)
  }

  const systemPrompt = `Ты — дружелюбный ИИ-консультант интернет-магазина скрытых микронаушников MIKRO (№1 в России).
Твоя специализация — ТОЛЬКО скрытые микронаушники (капсульные и магнитные) для экзаменов, переговоров и выступлений. Это НЕ обычные наушники для музыки.
Помогаешь клиентам выбрать подходящий микронаушник, отвечаешь на вопросы о доставке, оплате, гарантии и характеристиках.

Правила:
- Отвечай кратко, по-русски, вежливо и по делу (обычно 2–4 предложения).
- Рекомендуй конкретные товары ТОЛЬКО из каталога ниже, когда это уместно, обязательно указывая точное название и цену.
- Если вопрос не про магазин — мягко верни разговор к выбору микронаушников.
- Не выдумывай товары и цены, которых нет в каталоге.

Актуальный каталог MIKRO в наличии:
${catalogSummary}

Доставка: по всей России, в день заказа, нейтральная упаковка без логотипов.
Гарантия: 12 месяцев на все устройства, замена брака в течение 14 дней.`

  const result = await streamText({
    model: proxyAi('gpt-4o-mini'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  })

  // Оставляем твой рабочий метод стриминга без изменений!
  return result.toUIMessageStreamResponse()
}