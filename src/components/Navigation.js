import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  useTheme,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HelpIcon from '@mui/icons-material/Help';
import HomeIcon from '@mui/icons-material/Home';
import { useWeb3Context } from '../context/Web3Context';

const Navigation = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { account, disconnect } = useWeb3Context();

  const isAuthenticated = Boolean(account);
  const showNavigation = location.pathname !== '/' && location.pathname !== '/login';

  if (!showNavigation) {
    return (
      <AppBar 
        position="static" 
        sx={{ 
          background: 'transparent',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            color="primary"
            onClick={() => navigate('/help')}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 1)',
              },
              mr: 2,
            }}
          >
            <HelpIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar 
      position="static"
      sx={{
        background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          <HomeIcon />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Health Record System
        </Typography>

        <IconButton
          color="inherit"
          onClick={() => navigate('/help')}
          sx={{ mr: 2 }}
        >
          <HelpIcon />
        </IconButton>

        {isAuthenticated && (
          <Button 
            color="inherit" 
            onClick={disconnect}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            Disconnect
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
