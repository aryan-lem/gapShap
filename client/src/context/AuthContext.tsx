import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types/user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: () => {},
  logout: () => {}
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Reusable function to check authentication
  const checkAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/user`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Initial auth check when app loads
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Handle authentication callback
  useEffect(() => {
    if (location.pathname === '/auth-success') {
      checkAuth().then(success => {
        if (success) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      });
    }
  }, [location.pathname, navigate]);
  
  const login = () => {
    // Redirect to Auth0 login
    window.location.href = `${API_URL}/oauth2/authorization/auth0`;
  };
  
  const logout = async () => {
    try {
      // Clear local storage and session storage
      localStorage.clear();
      sessionStorage.clear();
  
      // Clear all cookies by setting expiration in the past
      document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
      
      const response = await fetch(`${API_URL}/api/logout`, {
        credentials: 'include',
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Logout response:', data);
        setUser(null);
        
        // Use the correct Auth0 logout URL format
        const logoutUrl = "https://dev-4pm565a3cspyz0h6.us.auth0.com/v2/logout" + 
                         "?client_id=STcoA62Iv2l7D7Nz54xQ9hfoIrTBvTJD" + 
                         "&returnTo=http://localhost:3000/" + 
                         "&federated"; // Note: setting a value for federated
                      
        window.location.href = logoutUrl;
      } else {
        // Fallback if API call fails
        setUser(null);
        navigate('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setUser(null);
      navigate('/');
    }
    // REMOVE the direct redirect that was here
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};