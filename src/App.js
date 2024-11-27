import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Web3Provider } from './context/Web3Context';
import ConnectWallet from './components/ConnectWallet';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import Navbar from './components/Navbar';
import Help from './components/Help';
import { useWeb3Context } from './context/Web3Context';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PrivateRoute = ({ children }) => {
  const { account } = useWeb3Context();
  
  if (!account) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Web3Provider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<ConnectWallet />} />
            <Route
              path="/login"
              element={
                <PrivateRoute>
                  <Login />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/doctor"
              element={
                <PrivateRoute>
                  <DoctorDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/patient"
              element={
                <PrivateRoute>
                  <PatientDashboard />
                </PrivateRoute>
              }
            />
            <Route path="/help" element={<Help />} />
          </Routes>
        </Router>
      </Web3Provider>
    </ThemeProvider>
  );
}

export default App;
