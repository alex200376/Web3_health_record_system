import React, { createContext, useContext, useState, useEffect } from 'react';
import Web3 from 'web3';
import HealthRecordContract from '../contracts/HealthRecord.json';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const connect = async () => {
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
      
      // Get contract instance
      const deployedNetwork = HealthRecordContract.networks[networkId];
      if (!deployedNetwork) {
        throw new Error('Please connect to the correct Ethereum network.');
      }
      
      const contractInstance = new web3Instance.eth.Contract(
        HealthRecordContract.abi,
        deployedNetwork.address
      );

      setWeb3(web3Instance);
      setAccount(account);
      setContract(contractInstance);

      // Setup event listeners for account and network changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

    } catch (err) {
      console.error('Error connecting to MetaMask:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      setAccount(null);
      setError('Please connect to MetaMask.');
    } else if (accounts[0] !== account) {
      // Selected account has changed
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    // Reload the page when the chain changes
    window.location.reload();
  };

  const disconnect = () => {
    setWeb3(null);
    setAccount(null);
    setContract(null);
    setError(null);
  };

  useEffect(() => {
    // Cleanup function to remove event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account]);

  const value = {
    web3,
    account,
    contract,
    error,
    loading,
    connect,
    disconnect,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3Context = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3Context must be used within a Web3Provider');
  }
  return context;
};
