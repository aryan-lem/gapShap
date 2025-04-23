import React from 'react';
import { useAuth } from '../context/AuthContext';
// import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome, {user.name}!</p>
      </div>
      
      <div className="user-profile">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.picture ? (
              <img src={user.picture} alt={user.name} />
            ) : (
              <div className="avatar-placeholder">
                {user.name.substring(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-info">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
        </div>
        
        
      </div>
    </div>
  );
};

export default Dashboard;