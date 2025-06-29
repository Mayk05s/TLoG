import { Box } from '@mui/material';

interface GooseButtonProps {
  canTap: boolean;
  onTap: () => void;
}

export function GooseButton({ canTap, onTap }: GooseButtonProps) {
  return (
    <Box
      onClick={canTap ? onTap : undefined}
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
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        '&:hover': {
          ...(canTap && {
            bgcolor: 'grey.200',
            borderColor: 'grey.500',
            transform: 'scale(1.02)',
          }),
        },
        '&:active': {
          ...(canTap && {
            transform: 'scale(0.98)',
            bgcolor: 'grey.300',
          }),
        },
      }}
    >
      <Box
        sx={{
          fontSize: '4rem',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        🪿
      </Box>
    </Box>
  );
}
