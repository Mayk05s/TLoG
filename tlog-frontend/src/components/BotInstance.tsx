import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { Close, Pause, PlayArrow, Refresh } from '@mui/icons-material';
import { BOT_SPEED_PRESETS } from '../config/bots.config';
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
  shouldRestart?: boolean;
  lastRequestDuration?: number;
  avgRequestDuration?: number;
  successfulRequests: number;
  failedRequests: number;
  lastActivity?: string;
}

interface LeaderboardEntry {
  username: string;
  points: number;
  tapCount?: number;
}

interface RoundData {
  readonly id: string;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly status: 'cooldown' | 'active' | 'completed';
  readonly leaderboard?: readonly LeaderboardEntry[];
}

interface BotInstanceProps {
  botConfig: { readonly username: string; readonly password: string };
  roundData: RoundData;
  speedPreset: SpeedPreset;
  onRemove: (username: string) => void;
  onStatsUpdate?: () => void;
}

export function BotInstance({
                              botConfig,
                              roundData,
                              speedPreset,
                              onRemove,
                              onStatsUpdate,
                            }: BotInstanceProps) {
  const [bot, setBot] = useState<BotStatus>({
    username: botConfig.username,
    status: 'authenticating',
    tapsCount: 0,
    pointsCount: 0,
    speedPreset,
    successfulRequests: 0,
    failedRequests: 0,
  });

  const intervalRef = useRef<number | undefined>(undefined);
  const initializationRef = useRef(false);

  const updateBot = useCallback((updates: Partial<BotStatus>) => {
    setBot(prev => ({ ...prev, ...updates }));
  }, []);

  const authenticateBot = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/auth/login`, {
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
        throw new Error(`Login failed: ${response.status}`);
      }

      const data = await response.json();
      return data.accessToken;
    } catch (error) {
      console.warn(`Bot ${botConfig.username} auth failed:`, error);
      return null;
    }
  }, [botConfig]);

  const registerBot = useCallback(async (): Promise<void> => {
    const response = await fetch(`${config.API_BASE_URL}/auth/signup`, {
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
  }, [botConfig]);

  const performTap = useCallback(async () => {
    if (!bot.token || roundData.status !== 'active') {
      return;
    }

    const now = new Date();
    if (roundData.startsAt && now.getTime() < roundData.startsAt) {
      return;
    }

    const startTime = performance.now();

    try {
      const response = await fetch(`${config.API_BASE_URL}/tap/${roundData.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bot.token}`,
        },
        signal: AbortSignal.timeout(10000), // Увеличиваем до 10 секунд для удаленного сервера
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (!response.ok) {
        throw new Error(`Tap failed: ${response.status} ${response.statusText} (${duration}ms)`);
      }

      updateBot({
        tapsCount: bot.tapsCount + 1,
        pointsCount: bot.pointsCount + ((bot.tapsCount + 1) % 11 === 0 ? 10 : 1),
        lastTap: Date.now(),
        successfulRequests: bot.successfulRequests + 1,
        lastRequestDuration: duration,
        avgRequestDuration: ((bot.avgRequestDuration || 0) * bot.successfulRequests + duration) / (bot.successfulRequests + 1),
      });

      onStatsUpdate?.();
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      // Останавливаем тапание при любой ошибке
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = undefined;
      }

      // Более детальная диагностика
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Request timeout after ${duration}ms`;
        } else if (error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
          errorMessage = `Resources exhausted after ${duration}ms`;
        } else if (error.message.includes('ERR_NETWORK')) {
          errorMessage = `Network error after ${duration}ms`;
        } else if (error.message.includes('ERR_CONNECTION')) {
          errorMessage = `Connection error after ${duration}ms`;
        } else {
          errorMessage = `${error.message} (${duration}ms)`;
        }
      }

      console.error(`[${bot.username}] Tap failed:`, errorMessage);

      updateBot({
        status: 'error',
        error: errorMessage,
        failedRequests: bot.failedRequests + 1,
      });
    }
  }, [bot.token, bot.tapsCount, bot.pointsCount, roundData.status, roundData.startsAt, roundData.id, updateBot, onStatsUpdate]);

  const getRandomInterval = useCallback((preset: SpeedPreset) => {
    const config = BOT_SPEED_PRESETS[preset];
    return Math.floor(
      Math.random() * (config.maxInterval - config.minInterval) + config.minInterval,
    );
  }, []);

  const startTapping = useCallback(() => {
    if (!bot.token || (bot.status !== 'idle' && bot.status !== 'active')) {
      return;
    }

    updateBot({ status: 'active' });
  }, [bot.token, bot.status, bot.username, roundData.status, updateBot]);

  // ✅ Отдельный effect для управления циклом тапания
  useEffect(() => {
    if (bot.status !== 'active' || !bot.token || roundData.status !== 'active') {
      return;
    }

    const preset = BOT_SPEED_PRESETS[bot.speedPreset];

    const scheduleNextTap = () => {
      // Проверяем актуальные условия
      if (bot.status === 'paused' || bot.status === 'error' || !bot.token || roundData.status !== 'active') {
        return;
      }

      const timeOk = !roundData.startsAt || new Date().getTime() >= roundData.startsAt;
      const randomChance = Math.random();
      const chanceOk = randomChance < preset.tapChance;
      const shouldTap = timeOk && chanceOk;

      if (shouldTap) {
        performTap();
      }

      const nextInterval = getRandomInterval(bot.speedPreset);
      intervalRef.current = setTimeout(scheduleNextTap, nextInterval);
    };

    const initialDelay = Math.random() * 10 + 50;
    intervalRef.current = setTimeout(scheduleNextTap, initialDelay);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [bot.status, bot.token, bot.speedPreset, bot.username, roundData.status, roundData.startsAt, performTap, getRandomInterval]);

  useEffect(() => {
    if (bot.shouldRestart && bot.token && bot.status === 'idle') {
      updateBot({ shouldRestart: false });
      setTimeout(startTapping, 1000);
    }
  }, [bot.shouldRestart, bot.token, bot.status, startTapping, updateBot]);

  const stopTapping = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = undefined;
    }
    updateBot({ status: 'idle' });
  }, [updateBot]);

  const pauseBot = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = undefined;
    }
    updateBot({ status: 'paused' });
  }, [updateBot]);

  const resumeBot = useCallback(() => {
    if (bot.token) {
      startTapping();
    }
  }, [bot.token, startTapping]);

  const initializeBot = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      let token = await authenticateBot();

      if (!token) {
        updateBot({ status: 'registering' });
        await registerBot();
        token = await authenticateBot();
      }

      if (token) {
        updateBot({
          status: 'idle',
          token,
          tapsCount: 0,
          pointsCount: 0,
          error: undefined,
        });

        if (roundData.status === 'active') {
          setTimeout(startTapping, 100);
        }
      } else {
        updateBot({
          status: 'error',
          error: 'Failed to authenticate after registration',
        });
      }
    } catch (error) {
      updateBot({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [authenticateBot, registerBot, updateBot, roundData.status, startTapping]);

  const restartBot = useCallback(async () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = undefined;
    }

    updateBot({
      status: 'authenticating',
      error: undefined,
      token: undefined,
    });

    initializationRef.current = false;

    setTimeout(() => {
      initializeBot();
    }, 500);
  }, [updateBot, initializeBot]);

  useEffect(() => {
    initializeBot();

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [initializeBot]);

  useEffect(() => {
    if (roundData.status === 'active' && bot.status === 'idle' && bot.token) {
      startTapping();
    } else if (roundData.status !== 'active' && bot.status === 'active') {
      stopTapping();
    }
  }, [roundData.status, bot.status, bot.token, startTapping, stopTapping]);

  useEffect(() => {
    updateBot({ speedPreset });
  }, [speedPreset, updateBot]);

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
      case 'active':
        return getDiffColor(diff);
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

  const leaderboardPoints = roundData.leaderboard?.find(entry => entry.username === bot.username)?.points || 0;
  const diff = bot.pointsCount - leaderboardPoints;

  return (
    <Card
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {bot.status === 'active' && (
                <Tooltip title="Pause">
                  <IconButton size="small" onClick={pauseBot} sx={{ p: 0.25 }}>
                    <Pause sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              {bot.status === 'paused' && (
                <Tooltip title="Resume">
                  <IconButton size="small" onClick={resumeBot} sx={{ p: 0.25 }}>
                    <PlayArrow sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              {bot.status === 'error' && (
                <Tooltip title="Restart">
                  <IconButton size="small" onClick={restartBot} sx={{ p: 0.25 }}>
                    <Refresh sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Remove">
                <IconButton size="small" onClick={() => onRemove(bot.username)} sx={{ p: 0.25 }}>
                  <Close sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          { bot.tapsCount > 0 && (
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
                  color="success"
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

        {/* Диагностика - показываем только для активных/работающих ботов */}
        {
         (bot.successfulRequests > 0 || bot.failedRequests > 0) && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem', mb: 0.5 }}>
              Diagnostics:
            </Typography>

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Tooltip title={`Successful requests: ${bot.successfulRequests}`} arrow>
                <Chip
                  label={`✓${bot.successfulRequests}`}
                  size="small"
                  variant="outlined"
                  color="success"
                  sx={{ fontSize: '0.55rem', height: '16px', '& .MuiChip-label': { px: 0.3 } }}
                />
              </Tooltip>

              {bot.failedRequests > 0 && (
                <Tooltip title={`Failed requests: ${bot.failedRequests}`} arrow>
                  <Chip
                    label={`✗${bot.failedRequests}`}
                    size="small"
                    variant="outlined"
                    color="error"
                    sx={{ fontSize: '0.55rem', height: '16px', '& .MuiChip-label': { px: 0.3 } }}
                  />
                </Tooltip>
              )}

              {bot.lastRequestDuration && (
                <Tooltip title={`Last request duration: ${bot.lastRequestDuration}ms`} arrow>
                  <Chip
                    label={`${bot.lastRequestDuration}ms`}
                    size="small"
                    variant="outlined"
                    color={bot.lastRequestDuration > 2000 ? 'error' : bot.lastRequestDuration > 1000 ? 'warning' : 'success'}
                    sx={{ fontSize: '0.55rem', height: '16px', '& .MuiChip-label': { px: 0.3 } }}
                  />
                </Tooltip>
              )}

              {bot.avgRequestDuration && (
                <Tooltip title={`Average request duration: ${Math.round(bot.avgRequestDuration)}ms`} arrow>
                  <Chip
                    label={`⌀${Math.round(bot.avgRequestDuration)}ms`}
                    size="small"
                    variant="outlined"
                    color="info"
                    sx={{ fontSize: '0.55rem', height: '16px', '& .MuiChip-label': { px: 0.3 } }}
                  />
                </Tooltip>
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
