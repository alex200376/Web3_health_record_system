import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import HelpIcon from '@mui/icons-material/Help';

const Help = () => {
  const sections = [
    {
      title: 'Getting Started',
      icon: <AccountBalanceWalletIcon />,
      content: [
        'Install MetaMask browser extension if you haven\'t already',
        'Connect your MetaMask wallet to the application',
        'Ensure you have the correct network selected in MetaMask',
        'Your role (Patient/Doctor/Admin) must be assigned by an administrator'
      ]
    },
    {
      title: 'For Patients',
      icon: <PersonIcon />,
      content: [
        'View your medical records securely stored on IPFS',
        'Download your medical documents',
        'View document details and history',
        'All your data is encrypted and secure'
      ]
    },
    {
      title: 'For Doctors',
      icon: <LocalHospitalIcon />,
      content: [
        'Access patient records you are authorized to view',
        'View patient medical history',
        'Download patient documents securely',
        'Maintain patient privacy and confidentiality'
      ]
    },
    {
      title: 'For Administrators',
      icon: <AdminPanelSettingsIcon />,
      content: [
        'Manage user roles and permissions',
        'Add new users to the system',
        'Monitor system activity',
        'Handle user access requests'
      ]
    },
    {
      title: 'Security Features',
      icon: <SecurityIcon />,
      content: [
        'Blockchain-based authentication',
        'IPFS distributed storage',
        'End-to-end encryption',
        'Role-based access control',
        'Secure wallet integration'
      ]
    },
    {
      title: 'Common Issues',
      icon: <HelpIcon />,
      content: [
        'MetaMask not connecting? Try refreshing the page',
        'Can\'t access your role? Contact an administrator',
        'Documents not loading? Check your internet connection',
        'IPFS errors? Ensure the IPFS gateway is accessible'
      ]
    }
  ];

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4,
            background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
            borderRadius: 2,
          }}
        >
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              textAlign: 'center',
              color: '#1976d2',
              mb: 4
            }}
          >
            Help & Documentation
          </Typography>

          {sections.map((section, index) => (
            <Accordion 
              key={index}
              sx={{
                mb: 2,
                '&:before': {
                  display: 'none',
                },
                background: 'transparent',
                boxShadow: 'none',
                '&.Mui-expanded': {
                  margin: '0 0 16px 0',
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  color: 'white',
                  borderRadius: '8px',
                  '&.Mui-expanded': {
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {section.icon}
                  <Typography sx={{ ml: 2, fontWeight: 'bold' }}>
                    {section.title}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderBottomLeftRadius: '8px',
                  borderBottomRightRadius: '8px',
                  border: '1px solid #e0e0e0',
                  borderTop: 'none',
                }}
              >
                <List>
                  {section.content.map((item, itemIndex) => (
                    <React.Fragment key={itemIndex}>
                      <ListItem>
                        <ListItemIcon>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: '#2196F3',
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText primary={item} />
                      </ListItem>
                      {itemIndex < section.content.length - 1 && (
                        <Divider variant="inset" component="li" />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      </Box>
    </Container>
  );
};

export default Help;
