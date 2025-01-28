import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItem, ListItemText, ListItemSecondary, Tooltip,
  CircularProgress, Alert, Tabs, Tab, FormControl, InputLabel, Select,
  MenuItem, Divider, Chip
} from '@mui/material';
import {
  Download, Visibility, Add, Edit, Delete,
  Upload, Search, Person, Description, Comment
} from '@mui/icons-material';
import { useWeb3Context } from '../context/Web3Context';
import { uploadToIPFS, getFromIPFS } from '../services/ipfsService';
import AccessRequest from './AccessRequest';

const DoctorDashboard = () => {
  const { contract, account, web3 } = useWeb3Context();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState('');

  // Fetch doctor's information
  const fetchDoctorInfo = async () => {
    if (!contract || !account) return;

    try {
      const doctorData = await contract.methods.users(account).call();
      if (doctorData.ipfsHash) {
        const ipfsData = await getFromIPFS(doctorData.ipfsHash);
        const parsedData = typeof ipfsData === 'string' ? JSON.parse(ipfsData) : ipfsData;
        setDoctorInfo({
          ...doctorData,
          ...parsedData
        });
      } else {
        setDoctorInfo(doctorData);
      }
    } catch (error) {
      console.error('Error fetching doctor info:', error);
      setError('Failed to fetch doctor information');
    }
  };

  // Fetch patients
  const fetchPatients = async () => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      console.log('Fetching patients...');
      
      // Get all UserAdded events for patients
      const events = await contract.getPastEvents('UserAdded', {
        filter: { role: '0' }, // Filter for patients (role = 0)
        fromBlock: 0,
        toBlock: 'latest'
      });

      // Get all UserDeleted events
      const deleteEvents = await contract.getPastEvents('UserDeleted', {
        fromBlock: 0,
        toBlock: 'latest'
      });

      // Create a map to track the latest event (add or delete) for each user
      const userLatestEvents = new Map();
      
      // Process deletion events first
      deleteEvents.forEach(event => {
        const { userAddress } = event.returnValues;
        const blockNumber = event.blockNumber;
        userLatestEvents.set(userAddress, {
          type: 'delete',
          blockNumber
        });
      });

      // Process addition events
      events.forEach(event => {
        const { userAddress } = event.returnValues;
        const blockNumber = event.blockNumber;
        
        const existingEvent = userLatestEvents.get(userAddress);
        if (!existingEvent || existingEvent.blockNumber < blockNumber) {
          userLatestEvents.set(userAddress, {
            type: 'add',
            blockNumber
          });
        }
      });

      // Use a Map to track unique patients by address
      const patientsMap = new Map();

      // Process all patient events
      for (const event of events) {
        const address = event.returnValues.userAddress;
        
        // Skip if this user's latest event is a deletion
        const latestEvent = userLatestEvents.get(address);
        if (latestEvent?.type === 'delete') {
          console.log('Skipping deleted user:', address);
          continue;
        }

        try {
          const user = await contract.methods.users(address).call();
          
          // Skip inactive users
          if (!user.isActive) {
            console.log('Skipping inactive user:', address);
            continue;
          }

          // Check if doctor has access to this patient
          const hasAccess = await contract.methods.doctorAccess(address, account).call();
          console.log('Access status for patient', address, ':', hasAccess);

          // Initialize basic patient data
          const patientData = {
            address,
            name: user.name,
            hasAccess
          };

          // Only fetch additional IPFS data if we have access
          if (hasAccess && user.ipfsHash && user.ipfsHash !== '') {
            try {
              const ipfsData = await getFromIPFS(user.ipfsHash);
              const additionalData = typeof ipfsData === 'string' ? JSON.parse(ipfsData) : ipfsData;
              Object.assign(patientData, additionalData);
            } catch (error) {
              console.error('Error fetching IPFS data for patient:', address, error);
            }
          }

          // Add or update patient in the map
          patientsMap.set(address, patientData);
        } catch (error) {
          console.error('Error processing patient:', address, error);
        }
      }

      // Convert map to array and set state
      const uniquePatients = Array.from(patientsMap.values());
      console.log('Final patient list:', uniquePatients);
      setPatients(uniquePatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (docData) => {
    if (!docData || !docData.ipfsHash) {
      setError('Invalid document data');
      return;
    }

    try {
      setLoading(true);
      
      // Get the document directly from IPFS daemon API
      const response = await fetch(`http://localhost:5001/api/v0/cat?arg=${docData.ipfsHash}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document from IPFS');
      }

      // Get the binary data
      const arrayBuffer = await response.arrayBuffer();
      
      // Create blob with PDF type
      const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', docData.name || `medical_document_${docData.ipfsHash.slice(0, 8)}.pdf`);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess('Document downloaded successfully');
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document. Please make sure IPFS is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (patient) => {
    if (!contract || !account) return;

    try {
      setLoading(true);
      await contract.methods.requestAccess(patient.address)
        .send({ from: account });
      setSuccess('Access request sent successfully');
      fetchPatients(); // Refresh the list
    } catch (error) {
      console.error('Error requesting access:', error);
      setError('Failed to request access');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmitted = () => {
    fetchPatients(); // Reload the patient list to update access status
  };

    const handleFileSelect = async (event) => {
      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.includes('pdf')) {
        setError('Only PDF files are allowed');
        return;
      }
    
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 10MB');
        return;
      }
    
      try {
        setLoading(true);
    
        // Read file as ArrayBuffer and create blob
        const arrayBuffer = await file.arrayBuffer();
        const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    
        // Create form data with the PDF file
        const formData = new FormData();
        formData.append('file', pdfBlob, file.name);
    
        // Upload using IPFS API directly
        const response = await fetch('http://localhost:5001/api/v0/add', {
          method: 'POST',
          body: formData
        });
    
        if (!response.ok) {
          throw new Error('Failed to upload to IPFS');
        }
    
        const result = await response.json();
        const ipfsHash = result.Hash;
    
        // Create document metadata
        const documentMetadata = {
          name: file.name,
          ipfsHash: ipfsHash,
          type: 'application/pdf',
          size: file.size,
          uploadDate: new Date().toISOString()
        };
    
        setSelectedFile(documentMetadata);
        setDocumentName(file.name);
        setSuccess('Document ready for upload');
      } catch (error) {
        console.error('Error uploading file:', error);
        setError('Failed to upload document. Please make sure IPFS is running.');
      } finally {
        setLoading(false);
        event.target.value = ''; // Reset file input
      }
    };
    
           const handleUploadDocument = async () => {
        if (!selectedFile?.ipfsHash || !documentName || !contract || !selectedPatient?.address) {
          setError('Please select a file and patient first');
          return;
        }
      
        setLoading(true);
        setError('');
      
        try {
          // Validate access
          const hasAccess = await contract.methods
            .doctorAccess(selectedPatient.address, account)
            .call();
      
          if (!hasAccess) {
            throw new Error('No permission to upload documents for this patient');
          }
      
          // Get current block for gas limit
          const block = await web3.eth.getBlock('latest');
          const blockGasLimit = Number(block.gasLimit);
          const gasLimit = Math.floor(blockGasLimit * 0.9); // 90% of block gas limit
      
          // Send transaction with fixed gas limit
          const tx = await contract.methods
            .addDocument(
              selectedPatient.address,
              documentName,
              selectedFile.ipfsHash
            )
            .send({
              from: account,
              gas: gasLimit // Use fixed gas limit
            });
      
          if (!tx.status) {
            throw new Error('Transaction failed');
          }
      
          setSelectedPatient(prev => ({
            ...prev,
            documents: [...(prev.documents || []), selectedFile]
          }));
      
          setSuccess('Document uploaded successfully');
          setUploadDialogOpen(false);
          setSelectedFile(null);
          setDocumentName('');
          await fetchPatients();
      
        } catch (err) {
          console.error('Error uploading document:', err);
          setError(
            err.message.includes('permission') ? 'No permission to upload' :
            err.message.includes('gas') ? 'Transaction failed - check gas settings' :
            'Upload failed - please try again'
          );
        } finally {
          setLoading(false);
        }
      };
  // Remove handleFileUpload as it's now combined with handleFileSelect
  useEffect(() => {
    if (!contract || !account) return;

    const cleanup = () => {
      // Cleanup any existing subscriptions
      if (contract.events.UserDeleted) {
        contract.events.UserDeleted().unsubscribe();
      }
      if (contract.events.AccessRevoked) {
        contract.events.AccessRevoked().unsubscribe();
      }
    };

    const subscribeToEvents = () => {
      cleanup(); // Cleanup before subscribing

      // Listen for UserDeleted events
      contract.events.UserDeleted({}, (error, event) => {
        if (error) {
          console.error('Error in UserDeleted event:', error);
          return;
        }
        console.log('User deleted:', event.returnValues);
        fetchPatients(); // Refresh the list
      });

      // Listen for AccessRevoked events
      contract.events.AccessRevoked({}, (error, event) => {
        if (error) {
          console.error('Error in AccessRevoked event:', error);
          return;
        }
        console.log('Access revoked:', event.returnValues);
        fetchPatients(); // Refresh the list
      });
    };

    // Initial fetch
    fetchDoctorInfo();
    fetchPatients();
    
    // Subscribe to events
    subscribeToEvents();

    // Cleanup on unmount
    return cleanup;
  }, [contract, account]);

  const renderPatientList = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Wallet Address</TableCell>
            <TableCell>Access Status</TableCell>
            {/* Only show these columns if we have access */}
            {patients.some(p => p.hasAccess) && (
              <>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Blood Group</TableCell>
                <TableCell>Date of Birth</TableCell>
                <TableCell>Allergies</TableCell>
              </>
            )}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.address}>
              <TableCell>{patient.name}</TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {patient.address.slice(0, 6)}...{patient.address.slice(-4)}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={patient.hasAccess ? "Access Granted" : "No Access"}
                  color={patient.hasAccess ? "success" : "default"}
                  size="small"
                />
              </TableCell>
              {/* Only show sensitive data if we have access */}
              {patients.some(p => p.hasAccess) && (
                <>
                  <TableCell>{patient.hasAccess ? patient.email : '***'}</TableCell>
                  <TableCell>{patient.hasAccess ? patient.phone : '***'}</TableCell>
                  <TableCell>{patient.hasAccess ? patient.bloodGroup : '***'}</TableCell>
                  <TableCell>
                    {patient.hasAccess && patient.dateOfBirth 
                      ? new Date(patient.dateOfBirth).toLocaleDateString() 
                      : '***'}
                  </TableCell>
                  <TableCell>{patient.hasAccess ? patient.allergies : '***'}</TableCell>
                 
                </>
              )}
              <TableCell>
                <Tooltip title={patient.hasAccess ? "View Details" : "Request Access Required"}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setTabValue(1); // Switch to Patient Details tab
                      }}
                      color="primary"
                      disabled={!patient.hasAccess}
                    >
                      <Visibility />
                    </IconButton>
                  </span>
                </Tooltip>
                {!patient.hasAccess && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleRequestAccess(patient)}
                    sx={{ ml: 1 }}
                  >
                    Request Access
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderDocumentList = () => (
    selectedPatient ? (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Patient Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1">Name: {selectedPatient.name}</Typography>
                <Typography variant="subtitle1">Email: {selectedPatient.email}</Typography>
                <Typography variant="subtitle1">Phone: {selectedPatient.phone}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1">Blood Group: {selectedPatient.bloodGroup}</Typography>
                <Typography variant="subtitle1">Date of Birth: {selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : 'N/A'}</Typography>
                <Typography variant="subtitle1">Allergies: {selectedPatient.allergies || 'None'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Documents
            </Typography>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => setUploadDialogOpen(true)}
              disabled={loading}
            >
              Upload Document
            </Button>
          </Box>
          <List>
            {selectedPatient.documents?.map((doc, index) => (
              <ListItem
                key={index}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', mb: 2 }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Download">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDownloadDocument(doc)}
                        disabled={loading}
                        color="primary"
                      >
                        <Download />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <Box sx={{ width: '100%' }}>
                  <Typography variant="subtitle1">
                    {doc.name || `Document ${index + 1}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>
    ) : (
      <Typography variant="body1" color="textSecondary">
        Please select a patient to view their documents
      </Typography>
    )
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Doctor Dashboard
          </Typography>
          {doctorInfo && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1">Name: {doctorInfo.name}</Typography>
                <Typography variant="subtitle1">Address: {account}</Typography>
                {doctorInfo.specialization && (
                  <Typography variant="subtitle1">Specialization: {doctorInfo.specialization}</Typography>
                )}
                {doctorInfo.hospitalAffiliation && (
                  <Typography variant="subtitle1">Hospital: {doctorInfo.hospitalAffiliation}</Typography>
                )}
              </Grid>
            </Grid>
          )}
        </Paper>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(event, newValue) => setTabValue(newValue)}>
            <Tab label="Patients" />
            <Tab label="Patient Details" disabled={!selectedPatient} />
          </Tabs>
        </Box>

        {tabValue === 0 && renderPatientList()}
        {tabValue === 1 && renderDocumentList()}

        {/* Upload Document Dialog */}
        <Dialog
          open={uploadDialogOpen}
          onClose={() => {
            setUploadDialogOpen(false);
            setSelectedFile(null);
            setDocumentName('');
          }}
        >
          <DialogTitle>Upload Document</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <input
                accept="application/pdf"
                style={{ display: 'none' }}
                id="raised-button-file"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="raised-button-file">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<Upload />}
                  sx={{ mb: 2 }}
                >
                  Select PDF File
                </Button>
              </label>
              {selectedFile && (
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Selected file: {selectedFile.name}
                </Typography>
              )}
              <TextField
                fullWidth
                label="Document Name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                sx={{ mb: 2 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUploadDocument}
              variant="contained"
              disabled={!selectedFile || !documentName || loading}
            >
              Upload
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default DoctorDashboard;
