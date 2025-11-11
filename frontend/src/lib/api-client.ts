const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

// Get token from localStorage
export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Set token in localStorage
export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

// Remove token from localStorage
export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

// API request wrapper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Auth API
export const auth = {
  signup: (data: { email: string; password: string; name?: string; phone?: string }) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => apiRequest('/api/auth/me'),
};

// Teams API
export const teams = {
  list: () => apiRequest('/api/teams/my-teams'),
  create: (data: { name: string; description?: string }) =>
    apiRequest('/api/teams/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  joinByCode: (inviteCode: string) =>
    apiRequest('/api/teams/join-by-code', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    }),
};

// Games API
export const games = {
  list: () => apiRequest('/api/games'),
  get: (id: string) => apiRequest(`/api/games/${id}`),
  create: (data: { title: string; description?: string; teamId: string }) =>
    apiRequest('/api/games', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

