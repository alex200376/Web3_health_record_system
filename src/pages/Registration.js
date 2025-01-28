import React from 'react';
import { Container, Box } from '@mui/material';
import PatientRegistration from '../components/PatientRegistration';

const Registration = () => (
  <Container>
    <Box sx={{ mt: 4, mb: 4 }}>
      <PatientRegistration />
    </Box>
  </Container>
);

export default Registration;