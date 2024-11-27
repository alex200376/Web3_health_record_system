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
  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  const [documentComment, setDocumentComment] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [openRequestDialog, setOpenRequestDialog] = useState(false);

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

  const handleAddComment = async () => {
    if (!selectedPatient || !selectedDocument || !documentComment.trim()) {
      setError('Please enter a comment');
      return;
    }

    try {
      setLoading(true);

      // Get current patient data from IPFS
      const user = await contract.methods.users(selectedPatient.address).call();
      let patientData = {};
      if (user.ipfsHash) {
        const ipfsData = await getFromIPFS(user.ipfsHash);
        patientData = typeof ipfsData === 'string' ? JSON.parse(ipfsData) : ipfsData;
      }

      // Add new comment
      const newComment = {
        doctorName: doctorInfo.name,
        doctorAddress: account,
        timestamp: new Date().toISOString(),
        content: documentComment
      };

      // Initialize or update comments for the document
      if (!patientData.comments) patientData.comments = {};
      if (!patientData.comments[selectedDocument.ipfsHash]) {
        patientData.comments[selectedDocument.ipfsHash] = [];
      }
      patientData.comments[selectedDocument.ipfsHash].push(newComment);

      // Upload updated data to IPFS
      const newIpfsHash = await uploadToIPFS(JSON.stringify(patientData));

      // Update user data on blockchain
      await contract.methods
        .updateUser(selectedPatient.address, selectedPatient.name, newIpfsHash)
        .send({ from: account });

      setSuccess('Comment added successfully');
      setOpenCommentDialog(false);
      setDocumentComment('');
      fetchPatients(); // Refresh patient data
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

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
                <TableCell>Blood Group</TableCell>
                <TableCell>Allergies</TableCell>
                <TableCell>Documents</TableCell>
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
                  <TableCell>{patient.hasAccess ? patient.bloodGroup : '***'}</TableCell>
                  <TableCell>{patient.hasAccess ? patient.allergies : '***'}</TableCell>
                  <TableCell>
                    {patient.hasAccess ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{patient.documents?.length || 0}</Typography>
                        {patient.documents && patient.documents.length > 0 && (
                          patient.documents.map((doc, index) => (
                            <Tooltip key={index} title={doc.name || 'Download Document'}>
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadDocument(doc)}
                                disabled={loading}
                                color="primary"
                              >
                                <Download />
                              </IconButton>
                            </Tooltip>
                          ))
                        )}
                      </Box>
                    ) : (
                      '***'
                    )}
                  </TableCell>
                </>
              )}
              <TableCell>
                <Tooltip title={patient.hasAccess ? "View Details" : "Request Access Required"}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => setSelectedPatient(patient)}
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
          <Typography variant="h6" gutterBottom>
            Documents for {selectedPatient.name}
          </Typography>
          <List>
            {selectedPatient.documents?.map((doc, index) => (
              <ListItem
                key={index}
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
                    <Tooltip title="Add Comment">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setOpenCommentDialog(true);
                        }}
                        color="primary"
                      >
                        <Comment />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemText
                  primary={doc.name || `Document ${index + 1}`}
                  secondary={
                    <Box component="div">
                      <Box component="div" sx={{ mb: 1 }}>
                        Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                      </Box>
                      {selectedPatient.comments?.[doc.ipfsHash]?.map((comment, i) => (
                        <Box key={i} sx={{ mt: 1, pl: 2, borderLeft: '2px solid #ddd' }}>
                          <Box component="div" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                            {comment.doctorName} - {new Date(comment.timestamp).toLocaleString()}
                          </Box>
                          <Box component="div" sx={{ fontSize: '0.875rem' }}>
                            {comment.content}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  }
                />
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
              </Grid>
            </Grid>
          )}
        </Paper>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Patients" />
            <Tab label="Documents" disabled={!selectedPatient} />
          </Tabs>
        </Box>

        {tabValue === 0 && renderPatientList()}
        {tabValue === 1 && renderDocumentList()}

        {/* Comment Dialog */}
        <Dialog open={openCommentDialog} onClose={() => setOpenCommentDialog(false)}>
          <DialogTitle>Add Comment</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Comment"
              type="text"
              fullWidth
              multiline
              rows={4}
              value={documentComment}
              onChange={(e) => setDocumentComment(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCommentDialog(false)}>Cancel</Button>
            <Button onClick={handleAddComment} variant="contained">
              Add Comment
            </Button>
          </DialogActions>
        </Dialog>

        <AccessRequest
          open={openRequestDialog}
          onClose={() => setOpenRequestDialog(false)}
          patientAddress={selectedPatient?.address || ''}
          onRequest={handleRequestSubmitted}
        />
      </Box>
    </Container>
  );
};

export default DoctorDashboard;
