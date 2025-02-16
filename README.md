# HealthChain - Blockchain Healthcare Records System

A secure, decentralized healthcare records management system built with Ethereum blockchain and IPFS.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [Kubo (IPFS)](https://docs.ipfs.tech/install/command-line/#install-official-binary) - For decentralized file storage
- [Ganache](https://trufflesuite.com/ganache/) - For local blockchain development
- [MetaMask](https://metamask.io/) browser extension

## Setup Instructions

### 1. Start IPFS Daemon
```bash
# Start the IPFS daemon in a terminal
ipfs daemon
```
The IPFS daemon should be running on http://localhost:5001

### 2. Configure Ganache
1. Launch Ganache
2. Create a new workspace (Ethereum)
3. Set the following configuration:
   - Port Number: 7545
   - Network ID: 1337
   - Gas Limit: 99999999
   - Gas Price: 2.5 GWEI

### 3. Configure MetaMask
1. Open MetaMask
2. Add a new network with these settings:
   - Network Name: Ganache
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
   - Currency Symbol: ETH
3. Import accounts from Ganache using their private keys

### 4. Install Dependencies
```bash
# Install project dependencies
npm install

# Install Truffle globally if you haven't already
npm install -g truffle
```

### 5. Deploy Smart Contracts
```bash
# From the project root directory
truffle compile
truffle migrate --reset
```

### 6. Start the Application
```bash
# Start the development server
npm start
```
The application will be available at http://localhost:3000

## Testing the Application

### 1. Basic Functionality Testing
1. Log in with different roles:
   - Admin: Use the first account from Ganache
   - Doctor: Create a doctor account through Admin dashboard
   - Patient: Create a patient account through Admin dashboard

2. Test file upload:
   - Log in as a patient
   - Upload a health record
   - Verify the file hash appears in the records list

### 2. Access Control Testing
1. Doctor requesting access:
   - Log in as a doctor
   - Request access to a patient's records
   - Verify the request appears in the patient's dashboard

2. Patient granting access:
   - Log in as a patient
   - View pending access requests
   - Grant/reject access to doctors
   - Verify doctors can/cannot view records based on access status

### 3. IPFS Verification
1. After uploading a file:
   - Note the IPFS hash
   - Visit http://localhost:8080/ipfs/[YOUR-HASH]
   - Verify the file is accessible through IPFS

### Common Issues and Solutions

1. **MetaMask Connection Issues**
   - Ensure you're on the correct network (Ganache)
   - Reset your account in MetaMask if transactions aren't showing

2. **IPFS Upload Failures**
   - Verify IPFS daemon is running
   - Check CORS settings: `ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'`

3. **Smart Contract Interactions Failing**
   - Ensure contracts are deployed to Ganache
   - Check if you have sufficient ETH in your account
   - Verify you're using the correct account in MetaMask

## Development Notes

- Smart contracts are in the `contracts/` directory
- Frontend React components are in `src/components/`
- IPFS integration is handled through `src/services/ipfsService.js`
- Contract artifacts are in `src/contracts/`

For any additional help or issues, please contact the development team.
