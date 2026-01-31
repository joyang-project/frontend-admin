import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '@/services/api';
import { jwtDecode } from 'jwt-decode';

interface User {
  username: string;
  sub: string;
}

interface AuthContextType {
  accessToken: string | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean; // Add loading state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState<boolean>(true); // Initialize as true

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decodedUser: User = jwtDecode(token);
        setUser(decodedUser);
        // setAccessToken(token); // accessToken is already initialized from localStorage
        // setIsAuthenticated(true); // isAuthenticated is already initialized from localStorage
      } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAccessToken(null); // Clear accessToken state
        setUser(null); // Clear user state
        setIsAuthenticated(false); // Set authenticated to false
      }
    }
    setIsLoading(false); // Authentication check is complete
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    const { accessToken, refreshToken } = response.data;
    const decodedUser: User = jwtDecode(accessToken);
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(decodedUser);
    setAccessToken(accessToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ accessToken, user, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
