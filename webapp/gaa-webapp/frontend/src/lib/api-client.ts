const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5011';

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
    const errorMessage = error.error || `HTTP ${response.status}`;
    const customError: any = new Error(errorMessage);
    customError.status = response.status;
    customError.data = error;
    throw customError;
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
  update: (teamId: string, data: { name: string; description?: string }) =>
    apiRequest(`/api/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateTeamColors: (teamId: string, data: { primary_color: string; secondary_color: string; accent_color?: string | null }) =>
    apiRequest(`/api/teams/${teamId}/colors`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  joinByCode: (inviteCode: string) =>
    apiRequest('/api/teams/join-by-code', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    }),
  getMembers: (teamId: string) =>
    apiRequest(`/api/teams/${teamId}/members`),
};

// Games API
export const games = {
  list: (teamId?: string) => {
    const url = teamId ? `/api/games?teamId=${teamId}` : '/api/games';
    return apiRequest(url);
  },
  get: (id: string) => apiRequest(`/api/games/${id}`),
  getUploadUrl: (fileName: string, fileType: string) =>
    apiRequest('/api/games/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType }),
    }),
  create: (data: { 
    title: string; 
    description?: string; 
    teamId: string; 
    videoUrl?: string;
    s3Key?: string;
    originalFilename?: string;
    fileSize?: number;
  }) =>
    apiRequest('/api/games', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEvents: (gameId: string, events: any[]) =>
    apiRequest(`/api/games/${gameId}/events`, {
      method: 'PUT',
      body: JSON.stringify({ events }),
    }),
  getDemo: () => apiRequest('/api/games/demo'),
};

// Admin API
export const admin = {
  getGames: () => apiRequest('/api/admin/games'),
  getTeams: () => apiRequest('/api/admin/teams'),
  getUsers: (teamId?: string) => {
    const url = teamId ? `/api/admin/users?teamId=${teamId}` : '/api/admin/users';
    return apiRequest(url);
  },
  getStats: () => apiRequest('/api/admin/stats'),
};

// Clubs API
export const clubs = {
  list: (filters?: { usesVeo?: string; county?: string; province?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.usesVeo) params.append('usesVeo', filters.usesVeo);
    if (filters?.county) params.append('county', filters.county);
    if (filters?.province) params.append('province', filters.province);
    if (filters?.search) params.append('search', filters.search);
    const url = params.toString() ? `/api/clubs?${params.toString()}` : '/api/clubs';
    return apiRequest(url);
  },
  getStats: () => apiRequest('/api/clubs/stats'),
  getCounties: () => apiRequest('/api/clubs/counties'),
  getProvinces: () => apiRequest('/api/clubs/provinces'),
};

