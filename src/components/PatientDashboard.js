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
  Download, Visibility, Close, Delete
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
    if (!contract || !account) {
      console.log('Contract or account not initialized');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching documents for account:', account);

      // Check if user exists first
      const userData = await contract.methods.users(account).call();
      if (!userData.isActive) {
        console.log('User not found or inactive');
        setDocuments([]);
        return;
      }

      // Get documents from blockchain with error handling
      const docs = await contract.methods.getDocuments(account).call({
        from: account,
        gas: 3000000 // Explicitly set gas limit
      });
      
      console.log('Raw documents:', docs);

      // Format the documents with additional error checking
      const formattedDocs = docs.map(doc => ({
        name: doc.name || 'Untitled Document',
        ipfsHash: doc.ipfsHash,
        uploadDate: doc.timestamp ? new Date(Number(doc.timestamp) * 1000).toISOString() : new Date().toISOString(),
        uploadedBy: doc.uploadedBy || account,
        type: 'application/pdf'
      }));

      console.log('Formatted documents:', formattedDocs);
      setDocuments(formattedDocs);

    } catch (error) {
      console.error('Error details:', error);
      if (error.message.includes('revert')) {
        setError('Smart contract error: Operation not allowed');
      } else if (error.message.includes('gas')) {
        setError('Transaction error: Please try again with higher gas limit');
      } else {
        setError('Failed to fetch documents: ' + error.message);
      }
      setDocuments([]); // Reset documents on error
    } finally {
      setLoading(false);
    }
  };

  // Add an effect to refetch documents when account changes
  useEffect(() => {
    if (contract && account) {
      fetchDocuments();
    }
  }, [contract, account]);

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

  const handleDeleteDocument = async (doc) => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      await contract.methods.removeDocument(account, doc.ipfsHash)
        .send({ from: account });
      setSuccess('Document deleted successfully');
      fetchDocuments(); // Refresh the list
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document: ' + error.message);
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
            <TableCell>Uploaded By</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((doc, index) => (
            <TableRow key={index}>
              <TableCell>{doc.name}</TableCell>
              <TableCell>{new Date(doc.uploadDate).toLocaleDateString()}</TableCell>
              <TableCell>
                {doc.uploadedBy?.toLowerCase() === account?.toLowerCase() ? 
                  'You' : 
                  `${doc.uploadedBy?.slice(0, 6)}...${doc.uploadedBy?.slice(-4)}`
                }
              </TableCell>
              <TableCell>Medical Document</TableCell>
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
                {doc.uploadedBy?.toLowerCase() === account?.toLowerCase() && (
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteDocument(doc)} color="error">
                      <Delete />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                No documents available
              </TableCell>
            </TableRow>
          )}
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
