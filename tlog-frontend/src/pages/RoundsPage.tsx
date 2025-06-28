import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { roundsApi } from '../api/client';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { CheckCircle, Clock, Play, Plus } from 'lucide-react';

export function RoundsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const { data: rounds, isLoading, error } = useQuery({
    queryKey: ['rounds'],
    queryFn: roundsApi.getRounds,
  });

  const createRoundMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      const startsAt = new Date(now.getTime() + 30000); // Start in 30 seconds
      return roundsApi.createRound({
        starts_at: startsAt.toISOString(),
        duration: 60, // 60 seconds duration
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      setIsCreating(false);
    },
    onError: (error) => {
      console.error('Failed to create round:', error);
      setIsCreating(false);
    },
  });

  const handleCreateRound = () => {
    setIsCreating(true);
    createRoundMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cooldown':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'active':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">Failed to load rounds</p>
            <Button onClick={() => window.location.reload()} className="w-full mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Game Rounds
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome, {user?.username}!
            </p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'admin' && (
              <Button
                onClick={handleCreateRound}
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isCreating ? 'Creating...' : 'Create Round'}
              </Button>
            )}
            <Button
              onClick={logout}
              variant="outline"
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {rounds?.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500 dark:text-gray-400">
                  No rounds available yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            rounds?.map((round) => (
              <Card
                key={round.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/round/${round.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(round.status)}
                      <div>
                        <h3 className="font-semibold text-lg">
                          Round {round.id.slice(0, 8)}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Status: <span className="capitalize">{round.status}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                      <div>Created: {formatDate(round.created_at)}</div>
                      <div>Starts: {formatDate(round.starts_at)}</div>
                      <div>Ends: {formatDate(round.ends_at)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
