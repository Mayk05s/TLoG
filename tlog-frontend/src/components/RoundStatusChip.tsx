import { Chip } from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
import type { RoundWithStatus } from '../store/types';
import { formatTimeLeft } from '../lib/utils';

interface RoundStatusChipProps {
  roundWithStatus: RoundWithStatus;
}

export function RoundStatusChip({ roundWithStatus }: RoundStatusChipProps) {
  const getStatusText = (): string => {
    switch (roundWithStatus.status) {
      case 'cooldown':
        return `Starts in ${formatTimeLeft(roundWithStatus.timeLeft || 0)}`;
      case 'active':
        return `Ends in ${formatTimeLeft(roundWithStatus.timeLeft || 0)}`;
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (roundWithStatus.status) {
      case 'active': return 'success';
      case 'cooldown': return 'warning';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (roundWithStatus.status) {
      case 'active': return <PlayArrow />;
      case 'cooldown': return <Stop />;
      case 'completed': return <Stop />;
      default: return <Stop />;
    }
  };

  return (
    <Chip
      icon={getStatusIcon()}
      label={getStatusText()}
      color={getStatusColor() as any}
    />
  );
}
