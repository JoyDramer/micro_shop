const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const authAPI = {
  register: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error('Ошибка регистрации');
    return response.json();
  },

  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/auth/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
    if (!response.ok) throw new Error('Неверный логин или пароль');
    
    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    return data;
  },

  getProfile: async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/auth/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Не авторизован');
    return response.json();
  }
};