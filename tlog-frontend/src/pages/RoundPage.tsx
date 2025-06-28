import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { type RoundDetailsResponse, roundsApi, type StatsResponse, tapsApi } from '../api';
import { calculateRoundStatus, formatTimeLeft } from '../lib/utils';
import { AppHeader } from '../components/AppHeader';
import { GooseButton } from '../components/GooseButton';

export function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { data: round, isLoading: roundLoading, error: roundError } = useQuery<RoundDetailsResponse, Error>({
    queryKey: ['round', id],
    queryFn: () => roundsApi.getRound(id!),
    refetchInterval: 2000,
    enabled: !!id,
  });

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery<StatsResponse, Error>({
    queryKey: ['stats', id],
    queryFn: () => roundsApi.getStats(id!),
    refetchInterval: 2000,
    enabled: !!id,
  });

  const tapMutation = useMutation({
    mutationFn: () => tapsApi.submitTap(id!),
    onSuccess: () => refetchStats(),
  });

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isLoading = roundLoading || statsLoading;
  const error = roundError || statsError;

  if (isLoading) {
    return (
      <>
        <AppHeader
          title="Game Rounds"
          username={user.username}
          role={user.role}
          onLogout={handleLogout}
        />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading round data...
            </Typography>
          </Box>
        </Container>
      </>
    );
  }

  if (error || !round || !stats) {
    return (
      <>
        <AppHeader
          title="Game Rounds"
          username={user.username}
          role={user.role}
          onLogout={handleLogout}
        />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Failed to load round data'}
          </Alert>
        </Container>
      </>
    );
  }

  const roundWithStatus = calculateRoundStatus(round, currentTime);
  const canTap = roundWithStatus.status === 'active' && user.role !== 'nikita';
  const isCompleted = roundWithStatus.status === 'completed';
  const winner = isCompleted && stats.leaderboard.length > 0 ? stats.leaderboard[0] : null;

  return (
    <>
      <AppHeader
        title="Game Rounds"
        username={user.username}
        role={user.role}
        onLogout={handleLogout}
      />

      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* Заголовок раунда на всю ширину с кнопкой возврата */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Round {round.id.slice(0, 8)}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => navigate('/rounds')}
            sx={{ minWidth: '120px' }}
          >
            ← Back to Rounds
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Основной контент */}
          <Box sx={{ flex: 1 }}>
            {/* Основная игровая карточка */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                {/* Статус и таймер */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Chip
                    label={roundWithStatus.status.charAt(0).toUpperCase() + roundWithStatus.status.slice(1)}
                    color={roundWithStatus.status === 'active' ? 'success' :
                           roundWithStatus.status === 'cooldown' ? 'warning' : 'default'}
                    size="large"
                  />
                  {roundWithStatus.timeLeft !== undefined && roundWithStatus.timeLeft > 0 && (
                    <Typography variant="h4" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                      {formatTimeLeft(roundWithStatus.timeLeft)}
                    </Typography>
                  )}
                </Box>

                {/* Счет пользователя - отдельный блок */}
                <Box sx={{
                  textAlign: 'center',
                  mb: 3,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'grey.300'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Your Score
                  </Typography>
                  <Typography variant="h2" sx={{
                    fontWeight: 'bold',
                    color: 'text.primary',
                    lineHeight: 1
                  }}>
                    {stats.stats.currentUserPoints}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Total in round: {stats.stats.totalPoints}
                  </Typography>
                </Box>

                {/* Игровое поле с гусем */}
                <GooseButton
                  canTap={canTap}
                  isPending={tapMutation.isPending}
                  onTap={() => tapMutation.mutate()}
                />

                {/* Информационные сообщения */}
                {roundWithStatus.status === 'cooldown' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Round starts in {formatTimeLeft(roundWithStatus.timeLeft || 0)}
                  </Alert>
                )}

                {isCompleted && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Round completed!
                      {winner && ` 🏆 Winner: ${winner.username} with ${winner.points} points`}
                    </Alert>
                    <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="h6" gutterBottom>
                        Final Results
                      </Typography>
                      <Typography variant="body1">
                        Total points scored: {stats.stats.totalPoints}
                      </Typography>
                      <Typography variant="body1">
                        Your final score: {stats.stats.currentUserPoints} points
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {user.role === 'nikita' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    👑 Nikita role: You can watch but cannot earn points
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Лидерборд справа от центрального контента */}
          <Box sx={{
            width: { xs: '100%', lg: '300px' },
            flexShrink: 0
          }}>
            <Card sx={{ position: { lg: 'sticky' }, top: { lg: 20 } }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🏆 Leaderboard
                </Typography>

                {stats.leaderboard.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No players yet
                    </Typography>
                  </Box>
                ) : (
                  <List dense>
                    {stats.leaderboard.map((entry, index) => (
                      <ListItem
                        key={entry.username}
                        sx={{
                          bgcolor: entry.username === user.username ? 'primary.light' : 'transparent',
                          borderRadius: 1,
                          mb: 0.5,
                          border: entry.username === user.username ? 1 : 0,
                          borderColor: 'primary.main'
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" component="span" sx={{ minWidth: '20px' }}>
                                  #{index + 1}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  component="span"
                                  sx={{
                                    fontWeight: entry.username === user.username ? 'bold' : 'normal',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {entry.username}
                                  {entry.username === user.username && ' (You)'}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                {entry.points}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </>
  );
}
