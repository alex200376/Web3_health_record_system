import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useWeb3Context } from '../context/Web3Context';

const Navbar = () => {
  const { account, disconnect } = useWeb3Context();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show navbar on the connect wallet page
  if (location.pathname === '/') {
    return null;
  }

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Health Record System
        </Typography>
        
        {account && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<AccountBalanceWalletIcon />}
              label={`${account.slice(0, 6)}...${account.slice(-4)}`}
              variant="outlined"
              sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                '& .MuiChip-icon': { color: 'white' }
              }}
            />
            <Button 
              color="inherit" 
              onClick={handleDisconnect}
              sx={{ 
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              variant="outlined"
            >
              Disconnect
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
