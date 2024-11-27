import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import { useWeb3Context } from '../context/Web3Context';

const AccessRequest = ({ open, onClose, patientAddress, onRequest }) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('24');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { contract, account } = useWeb3Context();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create request object
      const request = {
        doctorAddress: account,
        patientAddress,
        reason,
        requestDate: new Date().toISOString(),
        duration: parseInt(duration),
        status: 'pending'
      };

      // Send request to smart contract
      const tx = await contract.methods
        .createAccessRequest(
          patientAddress,
          reason,
          parseInt(duration)
        )
        .send({ from: account });

      if (tx.status) {
        onRequest(request);
        onClose();
      }
    } catch (err) {
      setError('Failed to submit request: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Request Access to Patient Records</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Reason for Access"
            multiline
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Access Duration</InputLabel>
            <Select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              label="Access Duration"
            >
              <MenuItem value="24">24 Hours</MenuItem>
              <MenuItem value="48">48 Hours</MenuItem>
              <MenuItem value="72">72 Hours</MenuItem>
              <MenuItem value="168">1 Week</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="caption" color="text.secondary">
            * Access will automatically expire after the selected duration
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !reason}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccessRequest;
