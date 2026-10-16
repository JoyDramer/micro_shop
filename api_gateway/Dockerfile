# Используем официальный легковесный образ Nginx
FROM nginx:alpine

# Удаляем стандартный конфиг Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Копируем наш собственный nginx.conf внутрь контейнера
COPY nginx.conf /etc/nginx/nginx.conf

# Открываем 80 порт
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]