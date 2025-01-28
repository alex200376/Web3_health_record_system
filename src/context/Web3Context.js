import React, { createContext, useContext, useState, useEffect } from 'react';
import Web3 from 'web3';
import HealthRecordContract from '../contracts/HealthRecord.json';
import AccessControlContract from '../contracts/AccessControl.json';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [accessControlContract, setAccessControlContract] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize Web3 and check if already connected
  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        try {
          // Check if already connected
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (err) {
          console.error('Error checking initial connection:', err);
        }
      }
    };
    initWeb3();
  }, []);

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to use this application.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      // Create Web3 instance
      const web3Instance = new Web3(window.ethereum);
      
      // Get network ID
      const networkId = await web3Instance.eth.net.getId();
      
      // Get main contract network data
      const networkData = HealthRecordContract.networks[networkId];
      if (!networkData) {
        throw new Error('Health Record contract not deployed to detected network.');
      }

      // Create main contract instance
      const contractInstance = new web3Instance.eth.Contract(
        HealthRecordContract.abi,
        networkData.address
      );

      // Get AccessControl contract network data
      const accessControlNetworkData = AccessControlContract.networks[networkId];
      if (!accessControlNetworkData) {
        throw new Error('AccessControl contract not deployed to detected network.');
      }

      // Create AccessControl contract instance
      const accessControlInstance = new web3Instance.eth.Contract(
        AccessControlContract.abi,
        accessControlNetworkData.address
      );

      setWeb3(web3Instance);
      setAccount(account);
      setContract(contractInstance);
      setAccessControlContract(accessControlInstance);

      // Setup event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return true;
    } catch (err) {
      console.error('Error connecting to MetaMask:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  const initializeContract = async (web3Instance) => {
    const networkId = await web3Instance.eth.net.getId();
    const networkData = HealthRecordContract.networks[networkId];
    
    if (networkData) {
      const contractInstance = new web3Instance.eth.Contract(
        HealthRecordContract.abi,
        networkData.address
      );
      return contractInstance;
    }
    throw new Error('Contract not deployed to detected network');
  };
  const disconnect = () => {
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
    setWeb3(null);
    setAccount(null);
    setContract(null);
    setAccessControlContract(null);
    setError(null);
  };

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      disconnect();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    // Reload the page when the chain changes
    window.location.reload();
  };

  return (
    <Web3Context.Provider value={{ 
      web3, 
      account, 
      contract, 
      accessControlContract,
      error, 
      loading, 
      connectWallet,
      disconnect
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3Context = () => useContext(Web3Context);
