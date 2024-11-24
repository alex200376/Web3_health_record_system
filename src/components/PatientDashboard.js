import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const PatientDashboard = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Patient Dashboard
        </Typography>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="body1">
            Patient dashboard functionality will be implemented here.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default PatientDashboard;
