import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import { CloudUpload, Delete, Download } from '@mui/icons-material';
import { useWeb3Context } from '../context/Web3Context';
import { uploadToIPFS, getFromIPFS } from '../services/ipfsService';
import { styled } from '@mui/material/styles';

const Input = styled('input')({
  display: 'none',
});

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminDashboard = () => {
  const { web3, account, contract } = useWeb3Context();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [isDefaultAdmin, setIsDefaultAdmin] = useState(false);

  const DEFAULT_ADMIN = '0xD9073E73717FCA172f29B55A0368ae41De35D237';

  useEffect(() => {
    const checkDefaultAdmin = async () => {
      if (account) {
        setIsDefaultAdmin(account.toLowerCase() === DEFAULT_ADMIN.toLowerCase());
      }
    };
    checkDefaultAdmin();
  }, [account]);

  // Form state
  const [newUser, setNewUser] = useState({
    address: '',
    name: '',
    role: '',
    // Common fields
    email: '',
    phone: '',
    // Patient specific fields
    dateOfBirth: '',
    bloodGroup: '',
    allergies: '',
    // Doctor specific fields
    specialization: '',
    licenseNumber: '',
    hospitalAffiliation: '',
    // Admin specific fields
    department: '',
    adminLevel: '',
    // Document
    documents: [],
  });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState({
    address: '',
    name: '',
    additionalInfo: '',
    ipfsHash: '',
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const roles = [
    { value: '0', label: 'Patient' },
    { value: '1', label: 'Doctor' },
    { value: '2', label: 'Admin' },
  ];

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    fetchUsers();
  }, [contract]);

  const fetchUsers = async () => {
    if (!contract) return;

    setLoading(true);
    try {
      // Get all user events (both additions and deletions)
      const addEvents = await contract.getPastEvents('UserAdded', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      const deleteEvents = await contract.getPastEvents('UserDeleted', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      // Create a map of deleted users
      const deletedUsers = new Map();
      deleteEvents.forEach(event => {
        const userAddress = event.returnValues.userAddress;
        const blockNumber = event.blockNumber;
        if (!deletedUsers.has(userAddress) || deletedUsers.get(userAddress) < blockNumber) {
          deletedUsers.set(userAddress, blockNumber);
        }
      });

      // Process add events and filter out deleted users
      const userPromises = addEvents
        .filter(event => {
          const userAddress = event.returnValues.userAddress;
          const addBlockNumber = event.blockNumber;
          return !deletedUsers.has(userAddress) || deletedUsers.get(userAddress) < addBlockNumber;
        })
        .map(async (event) => {
          const userAddress = event.returnValues.userAddress;
          try {
            const user = await contract.methods.users(userAddress).call();
            
            // Get IPFS data if available
            let additionalData = {};
            if (user.ipfsHash && user.ipfsHash !== '') {
              try {
                const ipfsData = await getFromIPFS(user.ipfsHash);
                if (typeof ipfsData === 'string') {
                  try {
                    additionalData = JSON.parse(ipfsData);
                  } catch {
                    // If parsing fails, treat the data as a raw string
                    additionalData = { rawData: ipfsData };
                  }
                } else if (typeof ipfsData === 'object' && ipfsData !== null) {
                  additionalData = ipfsData;
                }
              } catch (error) {
                console.error('Error fetching IPFS data:', error);
              }
            }

            return {
              address: userAddress,
              name: user.name,
              role: user.role.toString(),
              isActive: user.isActive,
              email: additionalData.email || '',
              phone: additionalData.phone || '',
              dateOfBirth: additionalData.dateOfBirth || '',
              bloodGroup: additionalData.bloodGroup || '',
              allergies: additionalData.allergies || '',
              specialization: additionalData.specialization || '',
              licenseNumber: additionalData.licenseNumber || '',
              hospitalAffiliation: additionalData.hospitalAffiliation || '',
              documents: Array.isArray(additionalData.documents) ? additionalData.documents : []
            };
          } catch (error) {
            console.error('Error fetching user details:', error);
            return null;
          }
        });

      const users = (await Promise.all(userPromises)).filter(user => user !== null);
      setUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    
    // Validate file type
    if (!file.type.includes('pdf')) {
      setError('Only PDF files are allowed');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setLoading(true);

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });

      // Create form data with the PDF file
      const formData = new FormData();
      formData.append('file', pdfBlob, file.name);

      // Upload using the IPFS API
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

      // Update user's documents array
      const updatedDocuments = [...(newUser.documents || []), documentMetadata];
      
      // Update the selected user's documents
      setNewUser(prev => ({
        ...prev,
        documents: updatedDocuments
      }));

      setSuccess('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload document. Please make sure IPFS is running.');
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDownloadDocument = async (docData) => {
    if (!docData || !docData.ipfsHash) {
      setError('Invalid document data');
      return;
    }

    try {
      setLoading(true);
      
      // Get the document directly from IPFS daemon API instead of gateway
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

  const handleRemoveDocument = (index) => {
    setNewUser(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const renderRoleSpecificFields = () => {
    switch (newUser.role) {
      case '0': // Patient
        return (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={newUser.dateOfBirth}
                onChange={(e) => setNewUser({ ...newUser, dateOfBirth: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Blood Group</InputLabel>
                <Select
                  value={newUser.bloodGroup}
                  onChange={(e) => setNewUser({ ...newUser, bloodGroup: e.target.value })}
                  label="Blood Group"
                >
                  {bloodGroups.map((group) => (
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
                rows={2}
                value={newUser.allergies}
                onChange={(e) => setNewUser({ ...newUser, allergies: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ border: '1px dashed grey', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Medical Documents
                </Typography>
                <input
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  id="document-upload"
                  type="file"
                  onChange={handleFileUpload}
                />
                <label htmlFor="document-upload">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<CloudUpload />}
                    disabled={loading}
                  >
                    Upload PDF Document
                  </Button>
                </label>
                {newUser.documents.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {newUser.documents.map((doc, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {doc.name}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveDocument(index)}
                        >
                          <Delete />
                        </IconButton>
                        <Tooltip title={doc.name || 'Download Document'}>
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadDocument(doc)}
                            color="primary"
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>
          </>
        );
      case '1': // Doctor
        return (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Specialization"
                value={newUser.specialization}
                onChange={(e) => setNewUser({ ...newUser, specialization: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="License Number"
                value={newUser.licenseNumber}
                onChange={(e) => setNewUser({ ...newUser, licenseNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hospital Affiliation"
                value={newUser.hospitalAffiliation}
                onChange={(e) => setNewUser({ ...newUser, hospitalAffiliation: e.target.value })}
              />
            </Grid>
          </>
        );
      case '2': // Admin
        return null; // No additional fields for admin
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (event) => {
    const { name, value } = event.target;
    setEditUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddUser = async () => {
    if (!contract || !account) return;

    // Check if trying to add an admin without being the default admin
    if (newUser.role === '2' && !isDefaultAdmin) {
      setError('Only the default admin can add new administrators');
      return;
    }

    setLoading(true);
    try {
      // Prepare IPFS data
      const ipfsData = {
        email: newUser.email,
        phone: newUser.phone,
        dateOfBirth: newUser.dateOfBirth,
        bloodGroup: newUser.bloodGroup,
        allergies: newUser.allergies,
        specialization: newUser.specialization,
        licenseNumber: newUser.licenseNumber,
        hospitalAffiliation: newUser.hospitalAffiliation,
        documents: newUser.documents,
      };

      // Upload to IPFS
      const ipfsHash = await uploadToIPFS(JSON.stringify(ipfsData));

      // Add user to blockchain
      await contract.methods
        .addUser(newUser.address, newUser.name, newUser.role, ipfsHash)
        .send({ from: account });

      setSuccess('User added successfully!');
      setNewUser({
        address: '',
        name: '',
        role: String(tabValue),
        email: '',
        phone: '',
        dateOfBirth: '',
        bloodGroup: '',
        allergies: '',
        specialization: '',
        licenseNumber: '',
        hospitalAffiliation: '',
        department: '',
        adminLevel: '',
        documents: [],
      });
      
      // Fetch updated user list
      await fetchUsers();
    } catch (err) {
      console.error('Error adding user:', err);
      setError(err.message || 'Error adding user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Upload updated info to IPFS
      const ipfsHash = await uploadToIPFS({
        additionalInfo: editUser.additionalInfo,
        timestamp: new Date().toISOString(),
      });

      // Update user on blockchain
      await contract.methods
        .updateUser(editUser.address, editUser.name, ipfsHash)
        .send({ from: account });

      setSuccess('User updated successfully!');
      setEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.message || 'Error updating user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (user) => {
    setEditUser({
      address: user.address,
      name: user.name,
      additionalInfo: user.additionalInfo || '',
      ipfsHash: user.ipfsHash || '',
    });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditUser({
      address: '',
      name: '',
      additionalInfo: '',
      ipfsHash: '',
    });
  };

  const handleOpenDeleteModal = (user) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if trying to delete default admin
      if (userToDelete.address === contract.defaultAdmin) {
        throw new Error('Cannot delete the default admin account');
      }

      // Check if user exists and is active
      const user = await contract.methods.users(userToDelete.address).call();
      if (!user.isActive) {
        throw new Error('User does not exist or is already inactive');
      }

      // Attempt to delete the user
      await contract.methods
        .deleteUser(userToDelete.address)
        .send({ from: account });

      setSuccess('User deleted successfully!');
      handleCloseDeleteModal();
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Error deleting user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setNewUser({
      address: '',
      name: '',
      role: String(newValue),
      email: '',
      phone: '',
      dateOfBirth: '',
      bloodGroup: '',
      allergies: '',
      specialization: '',
      licenseNumber: '',
      hospitalAffiliation: '',
      department: '',
      adminLevel: '',
      documents: [],
    });
  };

  const getFilteredUsers = (roleValue) => {
    return users.filter(user => user.role === roleValue);
  };

  const renderUserTable = (roleValue) => {
    const filteredUsers = getFilteredUsers(roleValue);
    const getColumns = () => {
      switch (roleValue) {
        case '0': // Patient
          return [
            { id: 'name', label: 'Name' },
            { id: 'email', label: 'Email' },
            { id: 'phone', label: 'Phone' },
            { id: 'dateOfBirth', label: 'Date of Birth' },
            { id: 'bloodGroup', label: 'Blood Group' },
            { id: 'documents', label: 'Documents' },
            { id: 'actions', label: 'Actions' },
          ];
        case '1': // Doctor
          return [
            { id: 'name', label: 'Name' },
            { id: 'email', label: 'Email' },
            { id: 'phone', label: 'Phone' },
            { id: 'specialization', label: 'Specialization' },
            { id: 'licenseNumber', label: 'License Number' },
            { id: 'hospitalAffiliation', label: 'Hospital' },
            { id: 'actions', label: 'Actions' },
          ];
        case '2': // Admin
          return [
            { id: 'name', label: 'Name' },
            { id: 'email', label: 'Email' },
            ...(isDefaultAdmin ? [{ id: 'actions', label: 'Actions' }] : []),
          ];
        default:
          return [];
      }
    };

    const canManageUser = (user) => {
      // Default admin can manage all users
      if (isDefaultAdmin) return true;
      
      // Regular admins can only manage patients and doctors
      if (user.role === '2') return false; // Can't manage admins
      
      return true;
    };

    return (
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell>
              {getColumns().map((column) => (
                <TableCell key={column.id} sx={{ fontWeight: 'bold' }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.address} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.address}
                </TableCell>
                {getColumns().map((column) => (
                  <TableCell key={column.id}>
                    {column.id === 'actions' ? (
                      canManageUser(user) && (
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleOpenEditModal(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteModal(user)}
                            disabled={user.address.toLowerCase() === account.toLowerCase()}
                          >
                            Delete
                          </Button>
                        </Box>
                      )
                    ) : column.id === 'documents' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{user.documents?.length || 0}</Typography>
                        {user.documents && user.documents.length > 0 && (
                          user.documents.map((doc, index) => (
                            <Tooltip key={index} title={doc.name || 'Download Document'}>
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadDocument(doc)}
                                color="primary"
                              >
                                <Download />
                              </IconButton>
                            </Tooltip>
                          ))
                        )}
                      </Box>
                    ) : (
                      user[column.id]
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage users and their roles in the healthcare system
        </Typography>
      </Box>

      {/* Alerts */}
      <Box mb={3}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="user management tabs">
          <Tab label="Patients" />
          <Tab label="Doctors" />
          <Tab label="Admins" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Add New Patient
          </Typography>
          <Grid container spacing={3}>
            {/* Common Fields */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ethereum Address"
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                variant="outlined"
              />
            </Grid>
            {/* Other common and patient-specific fields */}
            {renderRoleSpecificFields()}
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddUser}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Add Patient'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
        {renderUserTable('0')}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Add New Doctor
          </Typography>
          <Grid container spacing={3}>
            {/* Common Fields */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ethereum Address"
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                variant="outlined"
              />
            </Grid>
            {/* Other common and doctor-specific fields */}
            {renderRoleSpecificFields()}
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddUser}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Add Doctor'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
        {renderUserTable('1')}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Add New Admin
          </Typography>
          <Grid container spacing={3}>
            {/* Common Fields */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ethereum Address"
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddUser}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Add Admin'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
        {renderUserTable('2')}
      </TabPanel>

      {/* Modals */}
      <Dialog open={editModalOpen} onClose={handleCloseEditModal} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Ethereum Address"
                  value={editUser.address}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={editUser.name}
                  onChange={handleEditInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Information"
                  name="additionalInfo"
                  value={editUser.additionalInfo}
                  onChange={handleEditInputChange}
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Update User'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={deleteModalOpen} 
        onClose={handleCloseDeleteModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography>
              Are you sure you want to delete this user?
            </Typography>
            {userToDelete && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Address: {userToDelete.address}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Name: {userToDelete.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Role: {roles[userToDelete.role].label}
                </Typography>
              </Box>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDeleteModal}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
