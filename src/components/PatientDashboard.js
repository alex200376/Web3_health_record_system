import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Download, Visibility, Close
} from '@mui/icons-material';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItem, ListItemText, ListItemSecondaryAction,
  Tooltip
} from '@mui/material';
import { useWeb3Context } from '../context/Web3Context';
import { getFromIPFS } from '../services/ipfsService';
import AccessRequestList from './AccessRequestList';

const PatientDashboard = () => {
  const { contract, accessControlContract, account, web3 } = useWeb3Context();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [patientInfo, setPatientInfo] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadPatientInfo();
    fetchDocuments();
  }, []);

  const loadPatientInfo = async () => {
    try {
      const userData = await contract.methods.users(account).call();
      if (userData.ipfsHash) {
        const ipfsData = await getFromIPFS(userData.ipfsHash);
        const parsedData = typeof ipfsData === 'string' ? JSON.parse(ipfsData) : ipfsData;
        setPatientInfo({
          ...userData,
          ...parsedData
        });
      } else {
        setPatientInfo(userData);
      }
    } catch (err) {
      setError('Failed to load patient information: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      const userData = await contract.methods.users(account).call();
      
      if (userData.ipfsHash) {
        const ipfsData = await getFromIPFS(userData.ipfsHash);
        const parsedData = typeof ipfsData === 'string' ? JSON.parse(ipfsData) : ipfsData;
        setDocuments(parsedData.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (doc) => {
    try {
      setLoading(true);
      // Get the file as binary data from IPFS
      const binaryData = await getFromIPFS(doc.ipfsHash, true);
      
      // Create a blob with the correct type
      const blob = new Blob([binaryData], { type: doc.type });
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name; // This will preserve the original filename
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = async (doc) => {
    try {
      setLoading(true);
      // Get the file as binary data from IPFS
      const binaryData = await getFromIPFS(doc.ipfsHash, true);
      
      // Create a blob with the correct type
      const blob = new Blob([binaryData], { type: doc.type });
      const url = window.URL.createObjectURL(blob);
      
      setSelectedDocument({ ...doc, url });
      setViewerOpen(true);
    } catch (error) {
      console.error('Error viewing document:', error);
      setError('Failed to view document');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const renderDocuments = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Upload Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Size</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((doc, index) => (
            <TableRow key={index}>
              <TableCell>{doc.name}</TableCell>
              <TableCell>{new Date(doc.uploadDate).toLocaleDateString()}</TableCell>
              <TableCell>{doc.type}</TableCell>
              <TableCell>{Math.round(doc.size / 1024)} KB</TableCell>
              <TableCell>
                <Tooltip title="View">
                  <IconButton onClick={() => viewDocument(doc)}>
                    <Visibility />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download">
                  <IconButton onClick={() => downloadDocument(doc)}>
                    <Download />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Patient Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Patient Info */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Name
              </Typography>
              <Typography variant="body1">
                {patientInfo?.name || 'Not provided'}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Wallet Address
              </Typography>
              <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                {account}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Medical Records" />
                <Tab label="Access Requests" />
              </Tabs>
            </Box>

            {/* Medical Records Tab */}
            {tabValue === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Your Medical Records
                </Typography>
                {renderDocuments()}
              </Box>
            )}

            {/* Access Requests Tab */}
            {tabValue === 1 && accessControlContract && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Access Requests
                </Typography>
                <AccessRequestList userAddress={account} />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* PDF Viewer Dialog */}
      <Dialog
        open={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          if (selectedDocument) {
            window.URL.revokeObjectURL(selectedDocument.url);
            setSelectedDocument(null);
          }
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedDocument?.name}</Typography>
            <IconButton
              onClick={() => {
                setViewerOpen(false);
                if (selectedDocument) {
                  window.URL.revokeObjectURL(selectedDocument.url);
                  setSelectedDocument(null);
                }
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <iframe
              src={selectedDocument.url}
              style={{ width: '100%', height: '80vh', border: 'none' }}
              title="PDF Viewer"
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default PatientDashboard;
