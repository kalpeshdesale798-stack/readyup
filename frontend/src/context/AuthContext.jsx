import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import { initialAdminData } from '../services/mockData';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('readyup_auth_user');
      const token = apiClient.getToken();
      if (saved && token) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.email) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      const saved = localStorage.getItem('readyup_auth_user');
      const savedToken = apiClient.getToken();
      if (saved && savedToken) {
        return savedToken;
      }
      apiClient.clearToken();
      return null;
    } catch {
      apiClient.clearToken();
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const resetLoggingOut = useCallback(() => {
    setIsLoggingOut(false);
  }, []);

  useEffect(() => {
    if (user && token) {
      localStorage.setItem('readyup_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('readyup_auth_user');
      apiClient.clearToken();
    }
  }, [user, token]);

  // Synchronize authentication changes across multiple browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'readyup_auth_user' || e.key === 'readyup_auth_token' || e.key === null) {
        try {
          const savedUser = localStorage.getItem('readyup_auth_user');
          const savedToken = apiClient.getToken();
          if (savedUser && savedToken) {
            const parsed = JSON.parse(savedUser);
            if (parsed && typeof parsed === 'object' && parsed.email) {
              setUser(parsed);
              setToken(savedToken);
              return;
            }
          }
        } catch {
          // ignore parsing error
        }
        // Remote tab logged out or cleared credentials -> sync logout state
        setIsLoggingOut(true);
        setUser(null);
        setToken(null);
        apiClient.clearToken();
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  useEffect(() => {
    apiClient.setOnUnauthorized(() => {
      setIsLoggingOut(true);
      setUser(null);
      setToken(null);
      localStorage.removeItem('readyup_auth_user');
      navigate('/', { replace: true });
    });
  }, [navigate]);


  const login = async (email, password, requiredRole) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password, requiredRole);
      setUser(data.user);
      setToken(data.token);
      apiClient.setToken(data.token);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const data = await authService.register(userData);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setUser(null);
    setToken(null);
    apiClient.clearToken();
    localStorage.removeItem('readyup_auth_user');
    try {
      await authService.logout();
    } catch {
      // offline logout
    } finally {
      navigate('/', { replace: true });
    }
  };

  const updateProfile = async (updateData) => {
    const updated = await authService.updateProfile(updateData);
    setUser((prev) => ({ ...prev, ...updated }));
    return updated;
  };

  // Developer convenience switcher to quickly test Student, Coordinator, and Admin roles
  const switchRoleDev = useCallback(async (newRole) => {
    const demoEmail = `${newRole}@readyup.edu`;
    const demoPass = 'Password123!';
    try {
      const res = await authService.login(demoEmail, demoPass);
      if (res && res.token && !res.token.startsWith('mock_')) {
        setUser(res.user);
        setToken(res.token);
        apiClient.setToken(res.token);
        return res;
      }
    } catch {
      // Backend offline or unreachable, fallback to development mock user
    }

    const matchingUser = initialAdminData.users.find((u) => u.role === newRole) || {
      _id: 'usr_dev_' + newRole,
      name: newRole === 'admin' ? 'Dr. Vikram Malhotra' : newRole === 'coordinator' ? 'Prof. Sunita Patil' : 'Aarav Sharma',
      email: `${newRole}@readyup.edu`,
      role: newRole,
      department: newRole === 'coordinator' ? 'Training & Placement Cell' : newRole === 'admin' ? 'Dean Office' : 'Computer Science & Engineering',
      college: 'National Institute of Technology',
      graduationYear: 2026,
      studentId: newRole === 'student' ? 'CS2026-042' : `EMP-${newRole.toUpperCase()}-01`,
      isActive: true
    };

    const devToken = `mock_jwt_token_${newRole}_dev`;
    apiClient.setToken(devToken);
    setToken(devToken);
    setUser(matchingUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'student',
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        isLoggingOut,
        resetLoggingOut,
        login,
        register,
        logout,
        updateProfile,
        switchRoleDev
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
