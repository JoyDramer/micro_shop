# Этап 1: Установка зависимостей и сборка (Builder)
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы конфигурации (учитываем как npm, так и pnpm/yarn)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код и запускаем сборку Next.js
COPY . .

# Ловим переменную из docker-compose
ARG NEXT_PUBLIC_DADATA_API_KEY
# Передаем ее в окружение для Next.js
ENV NEXT_PUBLIC_DADATA_API_KEY=$NEXT_PUBLIC_DADATA_API_KEY

RUN npm run build

# Этап 2: Запуск в продакшене (Runner)
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Копируем только то, что нужно для работы Next.js (без исходников)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Next.js по умолчанию запускается на порту 3000
EXPOSE 3000

# Запускаем продакшен-сервер Next.js
CMD ["npm", "run", "start"]