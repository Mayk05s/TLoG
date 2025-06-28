import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';

// API Configuration
const API_BASE_URL = 'http://localhost:3001';

// API Types (simplified)
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'survivor' | 'nikita';
  };
}

interface Round {
  id: string;
  createdAt: number; // timestamp
  startsAt: number;  // timestamp
  endsAt: number;    // timestamp
}

// Тип для ответа от /stats/{roundId}
interface StatsResponse {
  round: Round;
  playerPoints: number;
  leaderboard: LeaderboardEntry[];
}

interface LeaderboardEntry {
  username: string;
  points: number;
}

// Добавляем тип для вычисленного статуса
interface RoundWithStatus extends Round {
  status: 'cooldown' | 'active' | 'completed';
  timeLeft?: number; // секунды до начала (для cooldown) или до конца (для active)
}

// API Functions
const authApi = {
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
  }
};

const roundsApi = {
  async getRounds(): Promise<Round[]> {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No access token found');
    }

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

  async getRound(id: string): Promise<StatsResponse> {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${API_BASE_URL}/stats/${id}`, {
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

  async createRound(): Promise<Round> {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No access token found');
    }

    // Создаем раунд который начнется через 30 секунд и длится 60 секунд
    const now = Date.now();
    const startsAt = now + 30000; // через 30 секунд
    const duration = 60; // 60 секунд

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

// Setup React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Login Page with Real API
function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(username, password),
    onSuccess: (data) => {
      // Store tokens and user info
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/rounds');
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: '1rem'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '28rem',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    padding: '1.5rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none'
  };

  const buttonStyle = {
    width: '100%',
    backgroundColor: loginMutation.isPending ? '#9ca3af' : '#2563eb',
    color: 'white',
    fontWeight: '500',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s'
  };

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '28rem' }}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem' }}>
            The Last of Guss
          </h1>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
                placeholder="Enter your username"
                required
                disabled={loginMutation.isPending}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="Enter your password"
                required
                disabled={loginMutation.isPending}
              />
            </div>

            {error && (
              <div style={{ color: '#dc2626', fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '0.375rem' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loginMutation.isPending} style={buttonStyle}>
              {loginMutation.isPending ? 'Connecting to backend...' : 'Login'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#1d4ed8' }}>
              ✅ React Query интегрирован<br/>
              🔌 Подключение к API: {API_BASE_URL}<br/>
              📍 Сейчас на: /login<br/>
              {loginMutation.isPending && '⏳ Отправка запроса...'}
              {error && '❌ Ошибка подключения к бэкенду'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Rounds Page with Real API Data
function RoundsPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('accessToken');
  const [currentTime, setCurrentTime] = useState(Date.now()); // Для обновления таймеров

  const { data: rounds, isLoading, error, refetch } = useQuery({
    queryKey: ['rounds'],
    queryFn: roundsApi.getRounds,
    refetchInterval: 5000, // Обновляем данные с сервера каждые 5 секунд
    onError: (error: Error) => {
      if (error.message.includes('401')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        navigate('/login');
      }
    },
  });

  // Мутация для создания раунда (только для админов)
  const createRoundMutation = useMutation({
    mutationFn: roundsApi.createRound,
    onSuccess: () => {
      refetch(); // Обновляем список раундов после создания
    },
    onError: (error: Error) => {
      console.error('Failed to create round:', error);
    },
  });

  // Обновляем текущее время каждую секунду для плавного отсчета
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleRoundClick = (roundId: string) => {
    navigate(`/round/${roundId}`);
  };

  const handleCreateRound = () => {
    createRoundMutation.mutate();
  };

  // Функция для расчета статуса и времени до изменения статуса (используем currentTime для плавного обновления)
  const calculateRoundStatus = (round: Round): RoundWithStatus => {
    const now = currentTime; // Используем локальное время вместо Date.now()

    // Добавляем отладочную информацию
    console.log('Calculating round status:', {
      roundId: round.id,
      now: now,
      nowFormatted: new Date(now).toISOString(),
      startsAt: round.startsAt,
      startsAtFormatted: new Date(round.startsAt).toISOString(),
      endsAt: round.endsAt,
      endsAtFormatted: new Date(round.endsAt).toISOString(),
      nowVsStart: now - round.startsAt,
      nowVsEnd: now - round.endsAt
    });

    // Убедимся, что все времена в миллисекундах
    const nowMs = now;
    const startsAtMs = round.startsAt;
    const endsAtMs = round.endsAt;

    if (nowMs < startsAtMs) {
      // Раунд еще не начался - период cooldown
      const timeLeft = Math.ceil((startsAtMs - nowMs) / 1000);
      console.log('Round status: COOLDOWN, timeLeft:', timeLeft);
      return { ...round, status: 'cooldown', timeLeft: Math.max(0, timeLeft) };
    } else if (nowMs >= startsAtMs && nowMs < endsAtMs) {
      // Раунд активен
      const timeLeft = Math.ceil((endsAtMs - nowMs) / 1000);
      console.log('Round status: ACTIVE, timeLeft:', timeLeft);
      return { ...round, status: 'active', timeLeft: Math.max(0, timeLeft) };
    } else {
      // Раунд завершен
      console.log('Round status: COMPLETED');
      return { ...round, status: 'completed' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { color: '#059669', bg: '#d1fae5' };
      case 'cooldown': return { color: '#d97706', bg: '#fef3c7' };
      case 'completed': return { color: '#6b7280', bg: '#f3f4f6' };
      default: return { color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Функция для форматирования времени в читаемый вид
  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return '00:00';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Функция для получения текста статуса с обратным отсчетом
  const getStatusText = (roundWithStatus: RoundWithStatus): string => {
    if (!roundWithStatus || !roundWithStatus.status) {
      return 'Loading...';
    }

    switch (roundWithStatus.status) {
      case 'cooldown':
        return `Starts in ${formatTimeLeft(roundWithStatus.timeLeft || 0)}`;
      case 'active':
        return `Ends in ${formatTimeLeft(roundWithStatus.timeLeft || 0)}`;
      case 'completed':
        return 'Completed';
      default:
        return roundWithStatus.status || 'Unknown';
    }
  };

  // Функция для безопасного получения статуса (с проверкой на undefined)
  const getStatusDisplayText = (status: string): string => {
    if (!status || typeof status !== 'string') {
      return 'Unknown';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '1rem'
  };

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
          <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>
            ⏳ Loading rounds from backend...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem' }}>
            <h3 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>❌ Backend Connection Error</h3>
            <p style={{ color: '#7f1d1d', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Failed to connect to backend at {API_BASE_URL}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Error: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <button
              onClick={() => refetch()}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              🔄 Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
              Game Rounds
            </h1>
            <p style={{ color: '#4b5563' }}>
              Welcome, {user.username}! 🎮 (Role: {user.role})
            </p>
            {/* Отладочная информация */}
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              Token: {token ? `${token.slice(0, 20)}...` : 'No token'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              color: '#374151',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Available Rounds ({rounds?.length || 0})
          </h3>

          {rounds?.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
              No rounds available yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {rounds?.map((round) => {
                const roundWithStatus = calculateRoundStatus(round);
                const statusStyle = getStatusColor(roundWithStatus.status);
                return (
                  <div
                    key={round.id}
                    onClick={() => handleRoundClick(round.id)}
                    style={{
                      padding: '1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                          Round {round.id.slice(0, 8)}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              color: statusStyle.color,
                              backgroundColor: statusStyle.bg
                            }}
                          >
                            {getStatusText(roundWithStatus)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          <div>Created: {formatDate(round.createdAt)}</div>
                          <div>Starts: {formatDate(round.startsAt)}</div>
                          <div>Ends: {formatDate(round.endsAt)}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '1.5rem' }}>
                        {roundWithStatus.status === 'active' ? '🟢' :
                         roundWithStatus.status === 'cooldown' ? '🟡' : '⚪'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '0.5rem'
          }}>
            <p style={{ fontSize: '0.875rem', color: '#15803d' }}>
              ✅ React Query работает<br/>
              🔌 Backend подключен: {API_BASE_URL}<br/>
              📍 Сейчас на: /rounds<br/>
              🔄 Данные обновляются каждые 5 секунд<br/>
              👤 Роль: {user.role}<br/>
              🔑 Token: {token ? 'Present' : 'Missing'}
            </p>
          </div>

          {/* Кнопка создания раунда (только для админов) */}
          {user.role === 'admin' && (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                onClick={handleCreateRound}
                disabled={createRoundMutation.isPending}
                style={{
                  width: '100%',
                  backgroundColor: createRoundMutation.isPending ? '#9ca3af' : '#22c55e',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: createRoundMutation.isPending ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {createRoundMutation.isPending ? 'Создание раунда...' : 'Создать новый раунд'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Round Detail Page
function RoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { data: statsData, isLoading, error } = useQuery({
    queryKey: ['round', id],
    queryFn: () => roundsApi.getRound(id!),
    enabled: !!id,
    refetchInterval: 1000, // Обновляем каждую секунду для точного таймера
  });

  // Обновляем текущее время каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Расчет статуса раунда
  const calculateRoundStatus = (round: Round): RoundWithStatus => {
    const now = currentTime;

    // Добавляем отладочную информацию
    console.log('Calculating round status:', {
      roundId: round.id,
      now: now,
      nowFormatted: new Date(now).toISOString(),
      startsAt: round.startsAt,
      startsAtFormatted: new Date(round.startsAt).toISOString(),
      endsAt: round.endsAt,
      endsAtFormatted: new Date(round.endsAt).toISOString(),
      nowVsStart: now - round.startsAt,
      nowVsEnd: now - round.endsAt
    });

    // Убедимся, что все времена в миллисекундах
    const nowMs = now;
    const startsAtMs = round.startsAt;
    const endsAtMs = round.endsAt;

    if (nowMs < startsAtMs) {
      // Раунд еще не начался - период cooldown
      const timeLeft = Math.ceil((startsAtMs - nowMs) / 1000);
      console.log('Round status: COOLDOWN, timeLeft:', timeLeft);
      return { ...round, status: 'cooldown', timeLeft: Math.max(0, timeLeft) };
    } else if (nowMs >= startsAtMs && nowMs < endsAtMs) {
      // Раунд активен
      const timeLeft = Math.ceil((endsAtMs - nowMs) / 1000);
      console.log('Round status: ACTIVE, timeLeft:', timeLeft);
      return { ...round, status: 'active', timeLeft: Math.max(0, timeLeft) };
    } else {
      // Раунд завершен
      console.log('Round status: COMPLETED');
      return { ...round, status: 'completed' };
    }
  };

  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { color: '#059669', bg: '#d1fae5' };
      case 'cooldown': return { color: '#d97706', bg: '#fef3c7' };
      case 'completed': return { color: '#6b7280', bg: '#f3f4f6' };
      default: return { color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '1rem'
  };

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
          <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>
            ⏳ Loading round details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !statsData || !statsData.round) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/rounds')}
            style={{
              marginBottom: '1.5rem',
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            ← Back to Rounds
          </button>
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem' }}>
            <h3 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>❌ Round Not Found</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Error: {error instanceof Error ? error.message : 'Round not found'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const round = statsData.round;
  const playerPoints = statsData.playerPoints;
  const leaderboard = statsData.leaderboard;

  const roundWithStatus = calculateRoundStatus(round);
  const statusStyle = getStatusColor(roundWithStatus.status);

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => navigate('/rounds')}
            style={{
              marginBottom: '1rem',
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            ← Back to Rounds
          </button>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
            Round {round.id.slice(0, 8)}
          </h1>
          <p style={{ color: '#4b5563', marginTop: '0.25rem' }}>
            Player: {user.username} (Role: {user.role}) | Your Points: {playerPoints}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Game Panel */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Game Status
            </h2>

            {/* Status Badge */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: statusStyle.color,
                  backgroundColor: statusStyle.bg
                }}
              >
                {roundWithStatus.status === 'cooldown' && `Starts in ${formatTimeLeft(roundWithStatus.timeLeft || 0)}`}
                {roundWithStatus.status === 'active' && `Ends in ${formatTimeLeft(roundWithStatus.timeLeft || 0)}`}
                {roundWithStatus.status === 'completed' && 'Completed'}
              </span>
            </div>

            {/* Timer Display */}
            {roundWithStatus.timeLeft !== undefined && roundWithStatus.status !== 'completed' && (
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#111827' }}>
                  {formatTimeLeft(roundWithStatus.timeLeft)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {roundWithStatus.status === 'cooldown' ? 'Until round starts' : 'Time remaining'}
                </div>
              </div>
            )}

            {/* Player Score */}
            <div style={{
              backgroundColor: '#f0f9ff',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                Your Score
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                {playerPoints}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                points
              </div>
            </div>

            {/* Round Info */}
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                Round Information
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: '1.5' }}>
                <div>Created: {formatDate(round.createdAt)}</div>
                <div>Starts: {formatDate(round.startsAt)}</div>
                <div>Ends: {formatDate(round.endsAt)}</div>
                <div>Duration: {Math.floor((round.endsAt - round.startsAt) / 1000 / 60)} minutes</div>
              </div>
            </div>

            {/* Action Button */}
            {roundWithStatus.status === 'active' && (
              <button
                style={{
                  width: '100%',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontWeight: '600',
                  padding: '1rem',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  aspectRatio: '1',
                  maxWidth: '8rem',
                  margin: '0 auto',
                  display: 'block'
                }}
              >
                TAP!
              </button>
            )}

            {roundWithStatus.status === 'cooldown' && (
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                backgroundColor: '#fef3c7',
                borderRadius: '0.5rem',
                color: '#92400e'
              }}>
                Round hasn't started yet
              </div>
            )}

            {roundWithStatus.status === 'completed' && (
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '0.5rem',
                color: '#6b7280'
              }}>
                Round has ended
              </div>
            )}
          </div>

          {/* Leaderboard Panel */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Leaderboard
            </h2>

            {leaderboard && leaderboard.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.username}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: index < 3 ? '#fef3c7' : '#f9fafb',
                      borderRadius: '0.375rem',
                      border: entry.username === user.username ? '2px solid #3b82f6' : '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                        #{index + 1}
                      </span>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: entry.username === user.username ? '600' : '400',
                        color: entry.username === user.username ? '#1d4ed8' : '#374151'
                      }}>
                        {entry.username}
                        {entry.username === user.username && ' (You)'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                      {entry.points} pts
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                No scores yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/rounds" element={<RoundsPage />} />
          <Route path="/round/:id" element={<RoundDetailPage />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
