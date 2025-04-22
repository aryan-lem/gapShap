import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">GapShap</Link>
      </div>
      <div className="navbar-links">
        <Link to="/" className="nav-link">Home</Link>
        
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <div className="nav-user">
              {user?.picture && (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="nav-user-avatar"
                />
              )}
              <span className="nav-username">{user?.name}</span>
            </div>
            <button onClick={logout} className="nav-button logout-button">
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-button login-button">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;