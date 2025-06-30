import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  IconButton,
  Slider,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, ExpandLess, ExpandMore, Pause, PlayArrow } from '@mui/icons-material';
import { useLoginMutation, useSignupMutation } from '../store/api';
import { BOT_BEHAVIOR, BOT_SPEED_PRESETS, BOTS_CONFIG } from '../config/bots.config';
import config from '../config';

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
  tapCount?: number;
}

interface BotManagerProps {
  roundId: string;
  roundStatus: 'cooldown' | 'active' | 'completed';
  onStatsUpdate?: () => void;
}

const speedPresetKeys = Object.keys(BOT_SPEED_PRESETS) as SpeedPreset[];

export function BotManager({ roundId, roundStatus, onStatsUpdate }: BotManagerProps) {
  const [activeBots, setActiveBots] = useState<BotStatus[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [selectedSpeedIndex, setSelectedSpeedIndex] = useState(1);
  const intervalsRef = useRef<Map<string, number>>(new Map());
  const leaderboardIntervalRef = useRef<number | undefined>(undefined);

  const [login] = useLoginMutation();
  const [signup] = useSignupMutation();

  const selectedSpeed = speedPresetKeys[selectedSpeedIndex];

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
      const response = await login({ username: botConfig.username, password: botConfig.password }).unwrap();
      return response.accessToken;
    } catch (error) {
      console.warn(`Bot ${botConfig.username} auth failed:`, error);
      return null;
    }
  };

  const registerBot = async (botConfig: typeof BOTS_CONFIG[0]): Promise<void> => {
    await signup({ username: botConfig.username, password: botConfig.password }).unwrap();
  };

  const updateBotStatus = (username: string, updates: Partial<BotStatus>) => {
    setActiveBots(prev => prev.map(bot =>
      bot.username === username ? { ...bot, ...updates } : bot,
    ));
  };

  const performBotTap = async (bot: BotStatus) => {
    if (!bot.token || roundStatus !== 'active') return;

    try {
      const response = await fetch(`${config.API_BASE_URL}/tap/${roundId}`, {
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
      const response = await fetch(`${config.API_BASE_URL}/rounds/${roundId}`, {
        headers: {
          'Authorization': `Bearer ${bot.token}`,
        },
      });

      if (response.ok) {
        const roundData = await response.json();
        const userEntry = roundData.leaderboard?.find((entry: LeaderboardEntry) => entry.username === bot.username);
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

        // Get initial bot statistics
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

  const getDiffColor = (diff: number) => {
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
        return '❌';
      default:
        return 'Unknown';
    }
  };

  const activeBotsCount = activeBots.filter(bot => bot.status === 'active').length;
  const totalTaps = activeBots.reduce((sum, bot) => sum + bot.tapsCount, 0);
  const canAddMore = activeBots.length < BOT_BEHAVIOR.MAX_BOTS && getNextAvailableBot();

  const fetchLeaderboard = useCallback(async () => {
    const botWithToken = activeBots.find(bot => bot.token);
    if (!botWithToken?.token) return;

    try {
      const response = await fetch(`${config.API_BASE_URL}/rounds/${roundId}`, {
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
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
      }}
    >
      <Container maxWidth={false} sx={{ px: 2 }}>
        <Card elevation={0} sx={{ bgcolor: 'transparent' }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Collapse in={isExpanded}>
              <Container sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                {/* Заголовок и статистика */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" sx={{ whiteSpace: 'nowrap' }}>
                  🤖 Bot Manager
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {activeBots.length}/{BOT_BEHAVIOR.MAX_BOTS} bots • {activeBotsCount} active
                </Typography>
                {activeBotsCount > 0 && (
                  <Typography variant="body2" color="info.main" sx={{ whiteSpace: 'nowrap' }}>
                    • {totalTaps} total taps
                  </Typography>
                )}
              </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                    Speed:
                  </Typography>
                  <Slider
                    value={selectedSpeedIndex}
                    onChange={(_, value) => setSelectedSpeedIndex(value as number)}
                    min={0}
                    max={speedPresetKeys.length - 1}
                    step={1}
                    marks={speedPresetKeys.map((_, index) => ({
                      value: index,
                      label: BOT_SPEED_PRESETS[speedPresetKeys[index]].name,
                    }))}
                    disabled={roundStatus !== 'active'}
                    sx={{ flex: 1 }}
                  />
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  onClick={addBot}
                  disabled={isAddingBot || roundStatus !== 'active' || !canAddMore}
                  sx={{ minWidth: '120px' }}
                >
                  {isAddingBot ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    'Add Bot'
                  )}
                </Button>
              </Box>
              </Container>

            {activeBots.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    width: '100%',
                    mb: 1,
                  }}
                >
                {activeBots.map((bot) => {
                  const leaderboardPoints = getLeaderboardPoints(bot.username);
                  const diff = bot.pointsCount - leaderboardPoints;

                  return (
                    <Card
                      key={bot.username}
                      sx={{
                        minWidth: 180,
                        maxWidth: 220,
                        bgcolor: bot.status === 'active' ? 'rgba(76, 175, 80, 0.12)' : 'background.default',
                        border: bot.status === 'active' ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid',
                        borderColor: bot.status === 'active' ? 'rgba(76, 175, 80, 0.3)' : 'divider',
                        flex: '1 1 auto',
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                            {getShortBotName(bot.username)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={getStatusText(bot.status, diff)}
                              size="small"
                              color={getStatusColor(bot.status, diff)}
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {bot.status === 'active' && (
                                <Tooltip title="Pause">
                                  <IconButton size="small" onClick={() => pauseBot(bot.username)} sx={{ p: 0.25 }}>
                                    <Pause sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {bot.status === 'paused' && (
                                <Tooltip title="Resume">
                                  <IconButton size="small" onClick={() => resumeBot(bot.username)} sx={{ p: 0.25 }}>
                                    <PlayArrow sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Remove">
                                <IconButton size="small" onClick={() => stopBot(bot.username)} sx={{ p: 0.25 }}>
                                  <Close sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {(bot.status === 'active' || bot.status === 'paused') && bot.tapsCount > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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

                              <Tooltip title={`Leaderboard points: ${leaderboardPoints}`} arrow>
                                <Chip
                                  label={`L:${leaderboardPoints}`}
                                  size="small"
                                  variant="outlined"
                                  color={'success'}
                                  sx={{
                                    fontSize: '0.6rem',
                                    height: '18px',
                                    '& .MuiChip-label': { px: 0.4 },
                                  }}
                                />
                              </Tooltip>

                              <Tooltip title={`Taps: ${bot.tapsCount}`} arrow>
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
                            <Typography variant="caption" color="text.secondary">
                              {BOT_SPEED_PRESETS[bot.speedPreset].name}
                            </Typography>
                          </Box>

                          {bot.error && (
                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                                {bot.error}
                              </Typography>
                          )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
            </Collapse>

            {/* Кнопка показать/скрыть детали внизу */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: activeBots.length > 0 ? 1 : 0 }}>
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                startIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                sx={{ minWidth: 'auto', fontSize: '0.8rem' }}
              >
                {isExpanded ? 'Hide' : 'Show'} Bot Manager {activeBots.length > 0 && `(${activeBots.length})`}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
