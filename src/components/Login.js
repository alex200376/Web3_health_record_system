import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useWeb3Context } from '../context/Web3Context';

const Login = () => {
  const { web3, account, contract } = useWeb3Context();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        if (!web3 || !account || !contract) {
          throw new Error('Web3 not initialized');
        }

        const role = await contract.methods.getUserRole(account).call();
        
        // Route based on user role
        switch (parseInt(role)) {
          case 0: // Patient
            navigate('/patient');
            break;
          case 1: // Doctor
            navigate('/doctor');
            break;
          case 2: // Admin
            navigate('/admin');
            break;
          default:
            setError('Invalid user role');
        }
      } catch (err) {
        console.error('Error checking user role:', err);
        setError(err.message || 'Error checking user role');
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [web3, account, contract, navigate]);

  const handleConnect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
    } catch (error) {
      console.error('Error connecting to MetaMask', error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" align="center" gutterBottom>
              Health Record System
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>
                Checking user role...
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" align="center" gutterBottom>
              Health Record System
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Health Record System
          </Typography>
          
          {!account ? (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleConnect}
              size="large"
            >
              Connect with MetaMask
            </Button>
          ) : !contract ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>
                Connecting to smart contract...
              </Typography>
            </Box>
          ) : (
            <Typography variant="body1" align="center">
              Connected: {account}
            </Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
