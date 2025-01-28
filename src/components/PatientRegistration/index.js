import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useWeb3Context } from '../../context/Web3Context';
import { uploadToIPFS } from '../../services/ipfsService';
const PatientRegistration = () => {
  const navigate = useNavigate();
  const { contract, account, web3, connectWallet } = useWeb3Context();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [walletLoading, setWalletLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    bloodGroup: '',
    allergies: ''
  });
  useEffect(() => {
    const initializeWallet = async () => {
      setWalletLoading(true);
      try {
        if (!account) {
          await connectWallet();
        }
      } catch (err) {
        console.error('Error initializing wallet:', err);
        setError('Failed to connect wallet');
      } finally {
        setWalletLoading(false);
      }
    };

    initializeWallet();

    // Add listeners for wallet changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', initializeWallet);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', initializeWallet);
        window.ethereum.removeListener('chainChanged', () => window.location.reload());
      }
    };
  }, [connectWallet, account]);
  // Add wallet info display component
  const WalletInfo = () => (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Connected Wallet Address:
      </Typography>
      {walletLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography>Connecting wallet...</Typography>
        </Box>
      ) : account ? (
        <Typography variant="body1">
          {`${account.substring(0, 6)}...${account.substring(38)}`}
        </Typography>
      ) : (
        <Button
          variant="outlined"
          onClick={connectWallet}
          size="small"
          sx={{ mt: 1 }}
        >
          Connect Wallet
        </Button>
      )}
    </Box>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!account) {
        throw new Error('Please connect your wallet first');
      }

      if (!contract || !web3) {
        throw new Error('Contract not initialized');
      }

      if (!formData.name || !formData.email) {
        throw new Error('Please fill all required fields');
      }

      // Prepare metadata
      const metadata = JSON.stringify({
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies,
        documents: []
      });

      // Upload metadata to IPFS
      const ipfsHash = await uploadToIPFS(metadata);

      // Register using connected wallet address
      const tx = await contract.methods
        .registerAsPatient(formData.name, ipfsHash)
        .send({ 
          from: account,
          gas: 500000
        });

      if (tx.status) {
        setSuccess('Registration successful!');
        setTimeout(() => navigate('/'), 2000);
      }

    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err.message.includes('already registered') ? 'Address already registered' :
        err.message.includes('wallet') ? 'Please connect your wallet first' :
        err.message.includes('fields') ? 'Please fill all required fields' :
        'Registration failed - please try again'
      );
    } finally {
      setLoading(false);
    }
};
return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>Patient Registration</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <WalletInfo />
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Blood Group</InputLabel>
              <Select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
                label="Blood Group"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                  <MenuItem key={group} value={group}>{group}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Allergies"
              multiline
              rows={3}
              value={formData.allergies}
              onChange={(e) => setFormData({...formData, allergies: e.target.value})}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Register'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default PatientRegistration;