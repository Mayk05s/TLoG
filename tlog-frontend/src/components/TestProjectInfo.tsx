import { Box, CardContent, Chip, Container, Typography } from '@mui/material';
import { AdminPanelSettings, Info } from '@mui/icons-material';

export function TestProjectInfo() {
  return (
    <Container maxWidth="sm" sx={{
      position: 'fixed', top: 10, pt: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
    }}>
      <CardContent sx={{ py: 1, padding: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Info sx={{ color: 'primary.main', mr: 1, fontSize: { xs: 16, sm: 20 } }} />
          <Typography variant="subtitle2" component="h3" color="primary"
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Test Project
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          This is a demo version of "The Last of Guss" game. Anyone can try it out!
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <AdminPanelSettings sx={{ color: 'warning.main', fontSize: { xs: 14, sm: 16 } }} />
          <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
            Credentials:
          </Typography>
          <Typography variant="body2" color="text.secondary"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>Username:</Typography>
          <Chip
            label="admin"
            size="small"
            variant="outlined"
            sx={{
              fontFamily: 'monospace',
              fontSize: { xs: '0.6rem', sm: '0.75rem' },
              height: { xs: '20px', sm: '24px' },
            }}
          />
          <Typography variant="body2" color="text.secondary"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>Password:</Typography>
          <Chip
            label="Admin123!"
            size="small"
            variant="outlined"
            sx={{
              fontFamily: 'monospace',
              fontSize: { xs: '0.6rem', sm: '0.75rem' },
              height: { xs: '20px', sm: '24px' },
            }}
          />
        </Box>
      </CardContent>
    </Container>
  );
}
