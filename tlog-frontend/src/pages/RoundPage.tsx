import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { roundsApi, tapsApi } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ArrowLeft, Award, Crown, Medal, Zap } from 'lucide-react';

export function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [playerStats, setPlayerStats] = useState({ points: 0, taps: 0 });

  const { data: round, isLoading: roundLoading } = useQuery({
    queryKey: ['round', id],
    queryFn: () => roundsApi.getRound(id!),
    enabled: !!id,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', id],
    queryFn: () => tapsApi.getStats(id!),
    enabled: !!id,
    refetchInterval: round?.status === 'active' ? 2000 : 5000, // Более частое обновление для активных раундов
  });

  const tapMutation = useMutation({
    mutationFn: () => tapsApi.tap(id!),
    onSuccess: () => {
      // Обновляем статистику сразу после тапа
      queryClient.invalidateQueries({ queryKey: ['stats', id] });
    },
  });

  // WebSocket для real-time обновлений (временно отключен)
  const { isConnected, isEnabled } = useWebSocket(id!, {
    onMessage: (message) => {
      // Обновляем локальную статистику от WebSocket
      setPlayerStats(prev => ({
        points: message.points,
        taps: prev.taps + 1,
      }));
      // Обновляем кеш React Query
      queryClient.invalidateQueries({ queryKey: ['stats', id] });
    },
  });

  // Timer countdown
  useEffect(() => {
    if (!round) return;

    const updateTimer = () => {
      const now = Date.now();
      const endsAt = new Date(round.ends_at).getTime();
      const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [round]);

  // Обновляем статистику игрока из API
  useEffect(() => {
    if (stats) {
      setPlayerStats(prev => ({
        ...prev,
        points: stats.playerPoints,
      }));
    }
  }, [stats]);

  const handleTap = () => {
    if (round?.status === 'active' && timeLeft && timeLeft > 0) {
      // Оптимистичное обновление - увеличиваем счетчик тапов сразу
      setPlayerStats(prev => ({
        ...prev,
        taps: prev.taps + 1,
      }));
      tapMutation.mutate();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-center text-sm font-bold">{index + 1}</span>;
    }
  };

  if (roundLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-600">Round not found</p>
            <Button onClick={() => navigate('/rounds')} className="w-full mt-4">
              Back to Rounds
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = round.status === 'active' && timeLeft && timeLeft > 0;
  const canTap = isActive && !tapMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Button
          onClick={() => navigate('/rounds')}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rounds
        </Button>

        {/* Индикатор подключения WebSocket (только если включен) */}
        {isEnabled && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            WebSocket: {isConnected ? '🟢 Connected' : '🔴 Disconnected (using polling)'}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Round {round.id.slice(0, 8)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status */}
              <div className="text-center">
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  round.status === 'active' ? 'bg-green-100 text-green-800' :
                    round.status === 'cooldown' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                }`}>
                  {round.status.charAt(0).toUpperCase() + round.status.slice(1)}
                </div>
              </div>

              {/* Timer */}
              {timeLeft !== null && (
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 dark:text-white">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {isActive ? 'Time remaining' : 'Round ended'}
                  </div>
                </div>
              )}

              {/* Player Stats */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Your Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{playerStats.points}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{playerStats.taps}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Taps</div>
                  </div>
                </div>
              </div>

              {/* Tap Button */}
              <div className="text-center">
                <Button
                  onClick={handleTap}
                  disabled={!canTap}
                  size="lg"
                  className={`w-32 h-32 rounded-full text-xl font-bold ${
                    canTap
                      ? 'bg-red-600 hover:bg-red-700 text-white transform hover:scale-105 transition-all'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {tapMutation.isPending ? '...' : 'TAP!'}
                </Button>
                {!isActive && round.status === 'completed' && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Round has ended
                  </p>
                )}
                {round.status === 'cooldown' && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Round hasn't started yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {stats?.leaderboard?.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No players yet
                    </p>
                  ) : (
                    stats?.leaderboard?.map((entry, index) => (
                      <div
                        key={entry.username}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          entry.username === user?.username
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {getRankIcon(index)}
                          <span className={`font-medium ${
                            entry.username === user?.username ? 'text-blue-700 dark:text-blue-300' : ''
                          }`}>
                            {entry.username}
                            {entry.username === user?.username && ' (You)'}
                          </span>
                        </div>
                        <div className="font-bold text-lg">
                          {entry.points}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
