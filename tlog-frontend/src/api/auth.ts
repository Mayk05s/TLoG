import { API_BASE_URL } from './config';
import type { LoginResponse } from './types';

export interface SignupRequest {
  username: string;
  password: string;
}

export const authApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async signup(data: SignupRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Signup failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
};
