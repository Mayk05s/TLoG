import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, Pause, PlayArrow } from '@mui/icons-material';
import { API_BASE_URL, authApi } from '../api';
import { BOT_BEHAVIOR, BOT_SPEED_PRESETS, BOTS_CONFIG } from '../config/bots.config';

type SpeedPreset = keyof typeof BOT_SPEED_PRESETS;

interface BotStatus {
  username: string;
  status: 'idle' | 'authenticating' | 'registering' | 'active' | 'paused' | 'error';
  token?: string;
  tapsCount: number;
  pointsCount: number;
  lastTap?: number;
  error?: string;
  speedPreset: SpeedPreset;
}

interface LeaderboardEntry {
  username: string;
  points: number;
}

interface BotManagerProps {
  roundId: string;
  roundStatus: 'cooldown' | 'active' | 'completed';
  onStatsUpdate?: () => void;
}

export function BotManager({ roundId, roundStatus, onStatsUpdate }: BotManagerProps) {
  const [activeBots, setActiveBots] = useState<BotStatus[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedPreset>('normal');
  const intervalsRef = useRef<Map<string, number>>(new Map());
  const leaderboardIntervalRef = useRef<number | undefined>(undefined);

  const stopAllBots = useCallback(() => {
    intervalsRef.current.forEach((interval) => {
      clearInterval(interval);
    });
    intervalsRef.current.clear();

    if (leaderboardIntervalRef.current) {
      clearInterval(leaderboardIntervalRef.current);
    }

    setActiveBots([]);
    setLeaderboardData([]);
  }, []);

  useEffect(() => {
    return () => {
      stopAllBots();
    };
  }, [stopAllBots]);

  useEffect(() => {
    if (roundStatus !== 'active') {
      stopAllBots();
    }
  }, [roundStatus, stopAllBots]);

  const authenticateBot = async (botConfig: typeof BOTS_CONFIG[0]): Promise<string | null> => {
    try {
      const response = await authApi.login(botConfig.username, botConfig.password);
      return response.accessToken;
    } catch (error) {
      console.warn(`Bot ${botConfig.username} auth failed:`, error);
      return null;
    }
  };

  const registerBot = async (botConfig: typeof BOTS_CONFIG[0]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: botConfig.username,
        password: botConfig.password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status}`);
    }
  };

  const updateBotStatus = (username: string, updates: Partial<BotStatus>) => {
    setActiveBots(prev => prev.map(bot =>
      bot.username === username ? { ...bot, ...updates } : bot,
    ));
  };

  const performBotTap = async (bot: BotStatus) => {
    if (!bot.token || roundStatus !== 'active') return;

    try {
      const response = await fetch(`${API_BASE_URL}/tap/${roundId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bot.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Tap failed: ${response.status}`);
      }

      setActiveBots(prev => prev.map(existingBot =>
        existingBot.username === bot.username
          ? {
            ...existingBot,
            tapsCount: existingBot.tapsCount + 1,
            pointsCount: existingBot.pointsCount + ((existingBot.tapsCount + 1) % 11 === 0 ? 10 : 1),
            lastTap: Date.now(),
          }
          : existingBot,
      ));

    } catch (error) {
      console.error(`Bot ${bot.username} tap failed:`, error);

      updateBotStatus(bot.username, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const calculateTapsFromPoints = (points: number): number => {
    if (points === 0) return 0;

    const bonusTaps = Math.floor(points / 10);
    const regularPoints = points - (bonusTaps * 9);

    return bonusTaps * 11 + Math.max(0, regularPoints - bonusTaps);
  };

  const fetchBotInitialStats = async (bot: BotStatus): Promise<{ taps: number; points: number }> => {
    if (!bot.token) return { taps: 0, points: 0 };

    try {
      const response = await fetch(`${API_BASE_URL}/rounds/${roundId}`, {
        headers: {
          'Authorization': `Bearer ${bot.token}`,
        },
      });

      if (response.ok) {
        const roundData = await response.json();
        const userEntry = roundData.leaderboard?.find((entry: any) => entry.username === bot.username);
        const initialPoints = userEntry?.points || 0;
        const initialTaps = userEntry?.tapCount || 0;

        const calculatedTaps = calculateTapsFromPoints(initialPoints);
        const finalTaps = Math.max(initialTaps, calculatedTaps);

        return {
          taps: finalTaps,
          points: initialPoints,
        };
      }
    } catch (error) {
      console.error(`Failed to fetch initial stats for ${bot.username}:`, error);
    }

    return { taps: 0, points: 0 };
  };

  const getRandomInterval = (speedPreset: SpeedPreset) => {
    const preset = BOT_SPEED_PRESETS[speedPreset];
    return Math.floor(
      Math.random() * (preset.maxInterval - preset.minInterval) + preset.minInterval,
    );
  };

  const startBot = (bot: BotStatus) => {
    if (!bot.token || roundStatus !== 'active') return;

    const preset = BOT_SPEED_PRESETS[bot.speedPreset];

    const interval = setInterval(() => {
      if (roundStatus !== 'active') {
        stopBot(bot.username);
        return;
      }

      if (Math.random() < preset.tapChance) {
        performBotTap(bot);
      }
    }, getRandomInterval(bot.speedPreset));

    intervalsRef.current.set(bot.username, interval);
    updateBotStatus(bot.username, { status: 'active' });
  };

  const stopBot = (username: string) => {
    const interval = intervalsRef.current.get(username);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(username);
    }
    setActiveBots(prev => prev.filter(bot => bot.username !== username));
  };

  const pauseBot = (username: string) => {
    const interval = intervalsRef.current.get(username);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(username);
    }
    updateBotStatus(username, { status: 'paused' });
  };

  const resumeBot = (username: string) => {
    const bot = activeBots.find(b => b.username === username);
    if (bot && bot.token) {
      startBot(bot);
    }
  };

  const getNextAvailableBot = () => {
    const usedBotNames = activeBots.map(bot => bot.username);
    return BOTS_CONFIG.find(bot => !usedBotNames.includes(bot.username));
  };

  const addBot = async () => {
    if (roundStatus !== 'active' || activeBots.length >= BOT_BEHAVIOR.MAX_BOTS) return;

    const botConfig = getNextAvailableBot();
    if (!botConfig) return;

    setIsAddingBot(true);

    const newBot: BotStatus = {
      username: botConfig.username,
      status: 'authenticating',
      tapsCount: 0,
      pointsCount: 0,
      speedPreset: selectedSpeed,
    };

    setActiveBots(prev => [...prev, newBot]);

    try {
      let token = await authenticateBot(botConfig);

      if (!token) {
        updateBotStatus(botConfig.username, { status: 'registering' });
        await registerBot(botConfig);
        token = await authenticateBot(botConfig);
      }

      if (token) {
        const botWithToken = { ...newBot, token };

        // Получаем начальную статистику бота
        const initialStats = await fetchBotInitialStats(botWithToken);

        updateBotStatus(botConfig.username, {
          status: 'idle',
          token,
          tapsCount: initialStats.taps,
          pointsCount: initialStats.points,
          error: undefined,
        });

        startBot({ ...botWithToken, tapsCount: initialStats.taps, pointsCount: initialStats.points });
      } else {
        updateBotStatus(botConfig.username, {
          status: 'error',
          error: 'Failed to authenticate after registration',
        });
      }
    } catch (error) {
      updateBotStatus(botConfig.username, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    setIsAddingBot(false);
  };

  const getShortBotName = (username: string) => {
    return username.replace('bot_', '').replace('_2', '²');
  };
  const getDiffColor = (diff) => {
    if (diff < 0) return 'error';
    if (Math.abs(diff) <= 2) return 'success';
    return 'warning';
  };

  const getStatusColor = (status: BotStatus['status'], diff: number) => {
    switch (status) {
      case 'active': {
        return getDiffColor(diff);
      }
      case 'paused':
        return 'warning';
      case 'authenticating':
      case 'registering':
        return 'info';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getLeaderboardPoints = (username: string): number => {
    const entry = leaderboardData.find(entry => entry.username === username);
    return entry?.points || 0;
  };

  const getStatusText = (status: BotStatus['status'], diff: number) => {
    switch (status) {
      case 'idle':
        return 'Ready';
      case 'authenticating':
        return 'Login...';
      case 'registering':
        return 'Signup...';
      case 'active':
        return `D:${diff}`;
      case 'paused':
        return '⏸️';
      case 'error':
        return '���';
      default:
        return 'Unknown';
    }
  };

  const activeBotsCount = activeBots.filter(bot => bot.status === 'active').length;
  const totalTaps = activeBots.reduce((sum, bot) => sum + bot.tapsCount, 0);
  const canAddMore = activeBots.length < BOT_BEHAVIOR.MAX_BOTS && getNextAvailableBot();

  const calculateBotPoints = (tapsCount: number): number => {
    const bonusTaps = Math.floor(tapsCount / 11);
    return tapsCount + (bonusTaps * 9);
  };

  const fetchLeaderboard = useCallback(async () => {
    const botWithToken = activeBots.find(bot => bot.token);
    if (!botWithToken?.token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/rounds/${roundId}`, {
        headers: {
          'Authorization': `Bearer ${botWithToken.token}`,
        },
      });
      if (response.ok) {
        const roundData = await response.json();
        setLeaderboardData(roundData.leaderboard || []);
        onStatsUpdate?.();
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  }, [roundId, onStatsUpdate, activeBots]);

  useEffect(() => {
    if (roundStatus === 'active' && activeBots.length > 0) {
      fetchLeaderboard();

      leaderboardIntervalRef.current = setInterval(fetchLeaderboard, 2000);
    } else if (leaderboardIntervalRef.current) {
      clearInterval(leaderboardIntervalRef.current);
    }

    return () => {
      if (leaderboardIntervalRef.current) {
        clearInterval(leaderboardIntervalRef.current);
      }
    };
  }, [roundStatus, activeBots.length, fetchLeaderboard]);

  if (roundStatus === 'completed') {
    return null;
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            🤖 Bot Manager
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Speed</InputLabel>
              <Select
                value={selectedSpeed}
                label="Speed"
                onChange={(e) => setSelectedSpeed(e.target.value as SpeedPreset)}
                disabled={roundStatus !== 'active'}
              >
                {Object.entries(BOT_SPEED_PRESETS).map(([key, preset]) => (
                  <MenuItem key={key} value={key}>
                    {preset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              size="small"
              onClick={addBot}
              disabled={isAddingBot || roundStatus !== 'active' || !canAddMore}
              sx={{ minWidth: '100px' }}
            >
              {isAddingBot ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                'Add Bot'
              )}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            {activeBots.length}/{BOT_BEHAVIOR.MAX_BOTS} bots • {activeBotsCount} active
          </Typography>
        </Box>

        {activeBotsCount > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {activeBotsCount} bots active • {totalTaps} total taps
          </Alert>
        )}

        {activeBots.length > 0 && (
          <>
            <Button
              variant="text"
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
              sx={{ mb: 1 }}
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </Button>

            <Collapse in={isExpanded}>
              <List dense>
                {activeBots.map((bot) => {
                  const leaderboardPoints = getLeaderboardPoints(bot.username);
                  const pointsMatch = bot.pointsCount === leaderboardPoints;

                  return (
                    <ListItem
                      key={bot.username}
                      sx={{
                        bgcolor: bot.status === 'active' ? 'rgba(76, 175, 80, 0.12)' : 'transparent',
                        borderRadius: 1,
                        mb: 0.5,
                        opacity: bot.status === 'error' ? 0.7 : 1,
                        border: bot.status === 'active' ? '1px solid rgba(76, 175, 80, 0.3)' : 'none',
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {getShortBotName(bot.username)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Speed: {BOT_SPEED_PRESETS[bot.speedPreset].name}
                              </Typography>

                              {/* Компактная статистика с diff */}
                              {(bot.status === 'active' || bot.status === 'paused') && bot.tapsCount > 0 && (
                                <Box
                                  sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                  <Tooltip title={`Bot calculated points: ${bot.pointsCount}`} arrow>
                                    <Chip
                                      label={`B:${bot.pointsCount}`}
                                      size="small"
                                      variant="outlined"
                                      color="info"
                                      sx={{
                                        fontSize: '0.6rem',
                                        height: '18px',
                                        '& .MuiChip-label': { px: 0.4 },
                                      }}
                                    />
                                  </Tooltip>

                                  <Tooltip
                                    title={`Leaderboard points: ${leaderboardPoints}`}
                                    arrow
                                  >
                                    <Chip
                                      label={`L:${leaderboardPoints}`}
                                      size="small"
                                      variant="outlined"
                                      color={pointsMatch ? 'success' : 'warning'}
                                      sx={{
                                        fontSize: '0.6rem',
                                        height: '18px',
                                        '& .MuiChip-label': { px: 0.4 },
                                      }}
                                    />
                                  </Tooltip>
                                  <Tooltip
                                    title={`Taps: ${bot.tapsCount}`}
                                    arrow
                                  >
                                    <Chip
                                      label={`T:${bot.tapsCount}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        fontSize: '0.6rem',
                                        height: '18px',
                                        '& .MuiChip-label': { px: 0.4 },
                                      }}
                                    />
                                  </Tooltip>
                                </Box>
                              )}
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

                              <Chip
                                label={getStatusText(bot.status, bot.pointsCount - leaderboardPoints)}
                                color={getStatusColor(bot.status, bot.pointsCount - leaderboardPoints)}
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                              />
                              {/* Кнопка паузы/воспроизведения */}
                              {(bot.status === 'active' || bot.status === 'paused') && (
                                <IconButton
                                  size="small"
                                  onClick={() => bot.status === 'active' ? pauseBot(bot.username) : resumeBot(bot.username)}
                                  color={bot.status === 'active' ? 'warning' : 'success'}
                                >
                                  {bot.status === 'active' ? <Pause fontSize="small" /> :
                                    <PlayArrow fontSize="small" />}
                                </IconButton>
                              )}

                              {/* Кнопка удаления (крестик) */}
                              <IconButton
                                size="small"
                                onClick={() => stopBot(bot.username)}
                                color="error"
                              >
                                <Close fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
}
