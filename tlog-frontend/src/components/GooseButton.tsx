import { Box } from '@mui/material';

interface GooseButtonProps {
  canTap: boolean;
  isPending: boolean;
  onTap: () => void;
}

export function GooseButton({ canTap, isPending, onTap }: GooseButtonProps) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '300px',
        bgcolor: canTap ? 'grey.100' : 'grey.300',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: canTap ? 'pointer' : 'not-allowed',
        transition: 'all 0.3s ease',
        border: 2,
        borderColor: canTap ? 'grey.400' : 'grey.300',
        '&:hover': canTap ? {
          bgcolor: 'grey.200',
          borderColor: 'grey.500',
          transform: 'scale(1.02)'
        } : {},
        '&:active': canTap ? {
          transform: 'scale(0.98)'
        } : {}
      }}
      onClick={canTap ? onTap : undefined}
    >
      <Box
        sx={{
          fontSize: '4rem',
          userSelect: 'none',
          filter: canTap ? 'none' : 'grayscale(100%)',
          transition: 'filter 0.3s ease'
        }}
      >
        {isPending ? '⏳' : '🦆'}
      </Box>
    </Box>
  );
}
