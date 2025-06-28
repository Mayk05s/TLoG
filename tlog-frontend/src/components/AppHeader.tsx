import { AppBar, Button, IconButton, Toolbar, Typography } from '@mui/material';
import { Logout } from '@mui/icons-material';

interface AppHeaderProps {
  title: string;
  username?: string;
  role?: string;
  onLogout?: () => void;
  onBack?: () => void;
  backButtonText?: string;
}

export function AppHeader({ title, username, role, onLogout, onBack, backButtonText }: AppHeaderProps) {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {username && role && (
          <Typography variant="body1" sx={{ mr: 2 }}>
            {username} ({role})
          </Typography>
        )}
        {onBack && (
          <Button color="inherit" onClick={onBack}>
            {backButtonText || 'Back'}
          </Button>
        )}
        {onLogout && (
          <IconButton color="inherit" onClick={onLogout}>
            <Logout />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
}
