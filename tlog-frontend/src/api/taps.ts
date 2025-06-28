import { API_BASE_URL } from './config';

export const tapsApi = {
  async submitTap(roundId: string): Promise<{ points: number; totalPoints: number }> {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('No access token found');

    const response = await fetch(`${API_BASE_URL}/tap/${roundId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit tap: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
};
