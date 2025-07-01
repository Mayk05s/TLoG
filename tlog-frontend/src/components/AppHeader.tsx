import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';

interface AppHeaderProps {
  username?: string;
  role?: string;
  onLogout?: () => void;
}

export function AppHeader({ username, role, onLogout }: AppHeaderProps) {
  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fcf5f4' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: '56px !important' }}>
          <img src="/tlog.svg" alt="TLoG Logo" style={{ height: '42px', marginRight: '16px' }} />

          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 'bold',
              color: 'text.primary',
              fontSize: {
                xs: '1.5rem',
                sm: '1.75rem',
                md: '2.125rem'
              }
            }}
          >
            The Last of Guss
          </Typography>
          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">{username}</Typography>
              <Typography variant="caption" color="text.secondary">({role})</Typography>
            </Box>

            <Button color="inherit" onClick={onLogout} size="small" variant="outlined">
              Logout
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
