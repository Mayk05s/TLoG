import type { Round, RoundWithStatus } from '../api/types';

export const calculateRoundStatus = (round: Round, currentTime: number): RoundWithStatus => {
  const now = currentTime;

  if (now < round.startsAt) {
    const timeLeft = Math.ceil((round.startsAt - now) / 1000);
    return { ...round, status: 'cooldown', timeLeft: Math.max(0, timeLeft) };
  } else if (now >= round.startsAt && now < round.endsAt) {
    const timeLeft = Math.ceil((round.endsAt - now) / 1000);
    return { ...round, status: 'active', timeLeft: Math.max(0, timeLeft) };
  } else {
    return { ...round, status: 'completed' };
  }
};

export const formatTimeLeft = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
