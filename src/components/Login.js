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
import { getFromIPFS } from '../services/ipfsService';

const Login = () => {
  const { web3, account, contract, disconnect } = useWeb3Context();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        if (!web3 || !account || !contract) {
          throw new Error('Web3 not initialized');
        }

        const userData = await contract.methods.users(account).call();
        const role = await contract.methods.getUserRole(account).call();
        const roleInt = parseInt(role);

        // If user is admin, allow access without IPFS check
        if (roleInt === 2) {
          navigate('/admin');
          return;
        }

        // For non-admin users, check IPFS data
        if (!userData.ipfsHash) {
          setError('No user profile found. Please contact the administrator to create your profile.');
          setLoading(false);
          return;
        }

        // Verify IPFS data exists and is accessible
        try {
          const ipfsData = await getFromIPFS(userData.ipfsHash);
          if (!ipfsData) {
            setError('Unable to retrieve user profile data. Please contact the administrator.');
            setLoading(false);
            return;
          }
        } catch (ipfsError) {
          console.error('Error fetching IPFS data:', ipfsError);
          setError('Unable to access user profile. Please ensure IPFS is running and try again.');
          setLoading(false);
          return;
        }
        
        // Route based on user role
        switch (roleInt) {
          case 0: // Patient
            navigate('/patient');
            break;
          case 1: // Doctor
            navigate('/doctor');
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

  const handleReturnHome = () => {
    disconnect(); // Disconnect the wallet
    navigate('/'); // Return to wallet connect page
  };

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4,
              background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
              borderRadius: 2,
            }}
          >
            <Typography variant="h4" align="center" gutterBottom>
              Health Record System
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography>
                Verifying user profile...
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
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4,
              background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
              borderRadius: 2,
            }}
          >
            <Typography variant="h4" align="center" gutterBottom>
              Health Record System
            </Typography>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                '& .MuiAlert-message': {
                  width: '100%',
                }
              }}
            >
              <Typography variant="subtitle1" gutterBottom>
                Access Denied
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
            <Button
              variant="contained"
              fullWidth
              onClick={handleReturnHome}
              sx={{
                mt: 2,
                py: 1.5,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #2196F3 90%)',
                }
              }}
            >
              Return to Home
            </Button>
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
              onClick={() => navigate('/')}
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
