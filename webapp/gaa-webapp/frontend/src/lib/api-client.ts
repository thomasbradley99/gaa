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
  listAll: () => apiRequest('/api/teams/all'),
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
  joinById: (teamId: string) =>
    apiRequest(`/api/teams/${teamId}/join`, {
      method: 'POST',
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
  updateUserRole: (userId: string, role: 'admin' | 'user') =>
    apiRequest(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  getStats: () => apiRequest('/api/admin/stats'),
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

// CRM API
export const crm = {
  getContacts: (filters?: { search?: string; club?: string; reply_status?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.club) params.append('club', filters.club);
    if (filters?.reply_status) params.append('reply_status', filters.reply_status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    const url = params.toString() ? `/api/crm/contacts?${params.toString()}` : '/api/crm/contacts';
    return apiRequest(url);
  },
  createContact: (data: any) =>
    apiRequest('/api/crm/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  importContacts: (contacts: any[]) =>
    apiRequest('/api/crm/contacts/import', {
      method: 'POST',
      body: JSON.stringify({ contacts }),
    }),
  getSequences: () => apiRequest('/api/crm/sequences'),
  createSequence: (data: { name: string; description?: string; enabled?: boolean }) =>
    apiRequest('/api/crm/sequences', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSequenceSteps: (sequenceId: string) =>
    apiRequest(`/api/crm/sequences/${sequenceId}/steps`),
  addSequenceStep: (sequenceId: string, data: { step_number: number; delay_days?: number; subject: string; body_html: string; body_text?: string }) =>
    apiRequest(`/api/crm/sequences/${sequenceId}/steps`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  enroll: (data: { sequence_id: string; contact_ids?: string[]; all_contacts?: boolean }) =>
    apiRequest('/api/crm/enroll', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEnrollments: (filters?: { sequence_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.sequence_id) params.append('sequence_id', filters.sequence_id);
    if (filters?.status) params.append('status', filters.status);
    const url = params.toString() ? `/api/crm/enrollments?${params.toString()}` : '/api/crm/enrollments';
    return apiRequest(url);
  },
  sendSequence: (data: { sequence_id: string; step_number?: number; limit?: number }) =>
    apiRequest('/api/crm/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReplies: (filters?: { processed?: boolean; contact_id?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.processed !== undefined) params.append('processed', filters.processed.toString());
    if (filters?.contact_id) params.append('contact_id', filters.contact_id);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const url = params.toString() ? `/api/crm/replies?${params.toString()}` : '/api/crm/replies';
    return apiRequest(url);
  },
  processReply: (replyId: string, replyStatus: string) =>
    apiRequest(`/api/crm/replies/${replyId}/process`, {
      method: 'POST',
      body: JSON.stringify({ reply_status: replyStatus }),
    }),
  getStats: () => apiRequest('/api/crm/stats'),
};

