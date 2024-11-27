import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useWeb3Context } from '../context/Web3Context';

const AccessRequestList = ({ userAddress }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { contract, account } = useWeb3Context();

  useEffect(() => {
    if (contract && userAddress) {
      loadRequests();
    }
  }, [contract, userAddress]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      // Get the list of pending requests using getPendingRequests
      const pendingDoctors = await contract.methods.getPendingRequests(userAddress).call();
      console.log('Pending doctors:', pendingDoctors);

      // Get details for each doctor
      const requestsData = await Promise.all(
        pendingDoctors.map(async (doctorAddress) => {
          const doctor = await contract.methods.users(doctorAddress).call();
          const hasAccess = await contract.methods.doctorAccess(userAddress, doctorAddress).call();
          
          return {
            id: doctorAddress,
            doctor: doctorAddress,
            doctorName: doctor.name,
            status: hasAccess ? 'approved' : 'pending',
            timestamp: Date.now()
          };
        })
      );

      console.log('Requests data:', requestsData);
      setRequests(requestsData.filter(req => req.status === 'pending'));
    } catch (err) {
      console.error('Failed to load requests:', err);
      setError('Failed to load requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (doctorAddress, approved) => {
    try {
      setLoading(true);
      if (approved) {
        const tx = await contract.methods.grantAccessToDoctor(doctorAddress)
          .send({ from: account });
        console.log('Access granted:', tx);
      } else {
        // Use the dedicated rejection function
        const tx = await contract.methods.rejectAccessRequest(doctorAddress)
          .send({ from: account });
        console.log('Request rejected:', tx);
      }
      await loadRequests(); // Reload the requests
    } catch (err) {
      console.error('Failed to process request:', err);
      setError('Failed to process request: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const statusColors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      expired: 'default'
    };

    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={statusColors[status]}
        size="small"
      />
    );
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Access Requests
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {requests.length === 0 ? (
        <Typography color="text.secondary">No pending requests</Typography>
      ) : (
        <List>
          {requests.map((request, index) => (
            <React.Fragment key={request.id}>
              {index > 0 && <Divider />}
              <ListItem
                alignItems="flex-start"
                secondaryAction={
                  request.status === 'pending' && (
                    <Box>
                      <Button
                        color="primary"
                        onClick={() => handleRequest(request.doctor, true)}
                        sx={{ mr: 1 }}
                      >
                        Approve
                      </Button>
                      <Button
                        color="error"
                        onClick={() => handleRequest(request.doctor, false)}
                      >
                        Reject
                      </Button>
                    </Box>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">
                        Dr. {request.doctorName}
                      </Typography>
                      {getStatusChip(request.status)}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Address: {request.doctor}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Requested: {new Date(request.timestamp).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default AccessRequestList;
