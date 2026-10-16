const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const ordersAPI = {
  // Получение истории заказов текущего пользователя
  getMyOrders: async () => {
    const token = localStorage.getItem('access_token');
    
    // ВАЖНО: Убедись, что эндпоинт /orders/me существует в твоем order_service.
    // Если он называется иначе (например, просто /orders/ или /orders/user), измени эту строку.
    const response = await fetch(`${API_URL}/orders/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Не удалось загрузить историю заказов');
    
    return response.json(); // Возвращает массив заказов
  }
};