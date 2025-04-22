import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import './Home.css';

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="home-container">
      <h1>Welcome to GapShap!</h1>
      <p className="tagline">Connect, share, and chat with friends.</p>
      
      <div className="home-cta">
        {isAuthenticated ? (
          <Link to="/dashboard" className="cta-button primary">
            Go to Dashboard
          </Link>
        ) : (
          <Link to="/login" className="cta-button primary">
            Get Started
          </Link>
        )}
      </div>
      
      <div className="home-features">
        <div className="feature-card">
          <h3>Connect</h3>
          <p>Find and connect with friends and colleagues.</p>
        </div>
        <div className="feature-card">
          <h3>Chat</h3>
          <p>Real-time messaging with your connections.</p>
        </div>
        <div className="feature-card">
          <h3>Share</h3>
          <p>Share your thoughts and moments with others.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;