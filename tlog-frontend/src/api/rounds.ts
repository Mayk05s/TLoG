import { API_BASE_URL } from './config';
import type { Round, RoundDetailsResponse, StatsResponse } from './types';

export const roundsApi = {
  async getRounds(): Promise<Round[]> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');

    const response = await fetch(`${API_BASE_URL}/rounds`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch rounds: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async getRound(id: string): Promise<RoundDetailsResponse> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');

    const response = await fetch(`${API_BASE_URL}/rounds/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch round: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async getStats(id: string): Promise<StatsResponse> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');

    const response = await fetch(`${API_BASE_URL}/rounds/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch round stats: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async createRound(): Promise<Round> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');

    const now = Date.now();
    const startsAt = now + 30000;
    const duration = 60;

    const response = await fetch(`${API_BASE_URL}/rounds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        starts_at: new Date(startsAt).toISOString(),
        duration: duration
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create round: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
};
