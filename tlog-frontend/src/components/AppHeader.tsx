import { Box, Button, Container, Typography } from '@mui/material';

interface AppHeaderProps {
  username?: string;
  role?: string;
  onLogout?: () => void;
  onBack?: () => void;
  backButtonText?: string;
}

export function AppHeader({ username, role, onLogout, onBack, backButtonText }: AppHeaderProps) {
  return (
    <Box sx={{
      bgcolor: 'background.paper',
      borderBottom: 1,
      borderColor: 'divider',
      mb: 3,
      py: 2,
    }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              component="img"
              src="/tlog-pb.svg"
              alt="TLoG Logo"
              sx={{
                height: 64,
                width: 'auto',
                objectFit: 'contain',
              }}
            />
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                The Last of Guss
              </Typography>

                <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Welcome, {username}! 🎮 { role && `(Role: ${role}))`}
                </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {onBack && (
              <Button variant="outlined" onClick={onBack}>
                {backButtonText || 'Back'}
              </Button>
            )}
            {onLogout && (
              <Button variant="contained" color="error" onClick={onLogout}>
                Logout
              </Button>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
