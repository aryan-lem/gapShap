import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
// import './Login.css';

const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }
  
  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Sign In to GapShap</h2>
        <p>Connect with friends and start chatting</p>
        
        <button onClick={login} className="login-button">
          <span className="login-icon">🔐</span>
          Sign in with Auth0
        </button>
        
        <div className="login-info">
          <p>New to GapShap? You'll be able to create an account during sign in.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;