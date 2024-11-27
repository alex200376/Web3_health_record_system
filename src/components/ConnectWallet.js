import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { useWeb3Context } from '../context/Web3Context';

const ConnectWallet = () => {
  const { connectWallet, account, error: web3Error, loading } = useWeb3Context();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (account) {
      navigate('/login');
    }
  }, [account, navigate]);

  useEffect(() => {
    setError(web3Error);
  }, [web3Error]);

  const handleConnect = async () => {
    try {
      setError(null);
      const success = await connectWallet();
      if (success) {
        navigate('/login');
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const features = [
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: '#2196F3' }} />,
      title: 'Secure Authentication',
      description: 'Your medical records are secured using blockchain technology and wallet-based authentication.',
    },
    {
      icon: <StorageIcon sx={{ fontSize: 40, color: '#2196F3' }} />,
      title: 'Decentralized Storage',
      description: 'All medical records are stored on IPFS, ensuring data integrity and availability.',
    },
    {
      icon: <LocalHospitalIcon sx={{ fontSize: 40, color: '#2196F3' }} />,
      title: 'Easy Access',
      description: 'Access your medical records anytime, anywhere using your connected wallet.',
    },
  ];

  const steps = [
    {
      label: 'Install MetaMask',
      description: (
        <>
          First, install the MetaMask browser extension from{' '}
          <Link
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
          >
            metamask.io
          </Link>
        </>
      ),
    },
    {
      label: 'Create or Import Wallet',
      description:
        'Create a new wallet or import an existing one using your secret recovery phrase.',
    },
    {
      label: 'Connect Wallet',
      description: 'Click the "Connect Wallet" button below to connect your MetaMask wallet to our application.',
    },
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#f5f5f5',
      py: 4
    }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 'bold',
              color: '#1976d2',
              mb: 2
            }}
          >
            Health Record System
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: '#666' }}
          >
            Secure, decentralized healthcare records management
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Left side - Connect Wallet */}
          <Grid item xs={12} md={7}>
            <Paper
              elevation={2}
              sx={{
                p: 4,
                height: '100%',
                bgcolor: '#fff',
                borderRadius: 2
              }}
            >
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                  <CircularProgress />
                </Box>
              ) : account ? (
                <Box sx={{ textAlign: 'center', my: 4 }}>
                  <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography>
                      Wallet connected: {account.substring(0, 6)}...{account.substring(38)}
                    </Typography>
                  </Alert>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/login')}
                    sx={{
                      py: 1.5,
                      px: 4,
                      bgcolor: '#1976d2',
                      '&:hover': {
                        bgcolor: '#1565c0'
                      }
                    }}
                  >
                    Continue to Login
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleConnect}
                  startIcon={<AccountBalanceWalletIcon />}
                  disabled={loading}
                  sx={{
                    py: 2,
                    mb: 4,
                    bgcolor: '#1976d2',
                    '&:hover': {
                      bgcolor: '#1565c0'
                    }
                  }}
                >
                  Connect Wallet
                </Button>
              )}

              <Grid container spacing={3}>
                {features.map((feature, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Card
                      sx={{
                        height: '100%',
                        boxShadow: 1,
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 2
                        }
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Box sx={{ mb: 2 }}>
                          {feature.icon}
                        </Box>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{ fontWeight: 500 }}
                        >
                          {feature.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          {feature.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Right side - Getting Started Guide */}
          <Grid item xs={12} md={5}>
            <Paper
              elevation={2}
              sx={{
                p: 4,
                bgcolor: '#fff',
                borderRadius: 2
              }}
            >
              <Typography
                variant="h5"
                gutterBottom
                sx={{
                  fontWeight: 500,
                  color: '#1976d2',
                  mb: 3
                }}
              >
                Getting Started
              </Typography>

              <Stepper 
                activeStep={activeStep} 
                orientation="vertical"
                sx={{
                  '.MuiStepLabel-root': {
                    cursor: 'pointer'
                  }
                }}
              >
                {steps.map((step, index) => (
                  <Step key={index}>
                    <StepLabel onClick={() => setActiveStep(index)}>
                      <Typography sx={{ fontWeight: 500 }}>
                        {step.label}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <Box sx={{ my: 2 }}>
                        {step.description}
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>

              <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#1976d2' }} gutterBottom>
                  Need Help?
                </Typography>
                <Typography variant="body2">
                  If you're having trouble connecting your wallet or accessing the system, check out our{' '}
                  <Link
                    component="button"
                    onClick={() => navigate('/help')}
                    sx={{
                      color: '#1976d2',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    detailed help guide
                  </Link>
                  {' '}or contact our support team.
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ConnectWallet;
