import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3Context } from '../context/Web3Context';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Alert,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const ConnectWallet = () => {
  const { connect, account, error } = useWeb3Context();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (account) {
      navigate('/login');
    }
  }, [account, navigate]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <AccountBalanceWalletIcon
            sx={{ fontSize: 64, color: 'primary.main', mb: 2 }}
          />
          <Typography variant="h4" component="h1" gutterBottom>
            Connect Your Wallet
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            To access the Health Record Management System, please connect your MetaMask wallet.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={connect}
            startIcon={<AccountBalanceWalletIcon />}
            sx={{ 
              minWidth: 200,
              py: 1.5,
              fontSize: '1.1rem',
            }}
          >
            Connect MetaMask
          </Button>

          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Don't have MetaMask?{' '}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit' }}
              >
                Download here
              </a>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ConnectWallet;
