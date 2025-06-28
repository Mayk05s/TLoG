import {
  CreateRoundRequest,
  LoginRequest,
  LoginResponse,
  LoginResponseSchema,
  Round,
  RoundsResponse,
  RoundsResponseSchema,
  StatsResponse,
  StatsResponseSchema,
  TapResponse,
  TapResponseSchema,
  UserProfile,
  UserProfileSchema,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  parser?: (data: unknown) => T
): Promise<T> {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return parser ? parser(data) : data;
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, LoginResponseSchema.parse);

    // Store tokens
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);

    return response;
  },

  async getProfile(): Promise<UserProfile> {
    return apiRequest('/auth/profile', {}, UserProfileSchema.parse);
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

export const roundsApi = {
  async getRounds(): Promise<RoundsResponse> {
    return apiRequest('/rounds', {}, RoundsResponseSchema.parse);
  },

  async getRound(id: string): Promise<Round> {
    return apiRequest(`/rounds/${id}`, {});
  },

  async createRound(data: CreateRoundRequest): Promise<Round> {
    return apiRequest('/rounds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const tapsApi = {
  async tap(roundId: string): Promise<TapResponse> {
    return apiRequest(`/tap/${roundId}`, {
      method: 'POST',
    }, TapResponseSchema.parse);
  },

  async getStats(roundId: string): Promise<StatsResponse> {
    return apiRequest(`/stats/${roundId}`, {}, StatsResponseSchema.parse);
  },
};
