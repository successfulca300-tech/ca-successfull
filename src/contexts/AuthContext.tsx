import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/lib/api";

type UserRole = 'admin' | 'subadmin' | 'teacher' | 'user';

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  session: { token: string } | null;
  loading: boolean;
  userRole: UserRole | null;
  signUp: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    attempt: 'May 26' | 'Sept 26' | 'Jan 26';
    level: 'CA Inter' | 'CA Final';
    preparingFor: 'Group 1' | 'Group 2' | 'Both Groups';
    address: string;
  }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role?: UserRole }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setSession({ token });
        setUserRole((userData.role as UserRole) || 'user');
        
        // Verify token is still valid by fetching current user
        authAPI.getMe()
          .then((currentUser) => {
            const userWithRole: User = {
              _id: currentUser._id,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role as UserRole,
              isActive: currentUser.isActive,
              createdAt: currentUser.createdAt,
            };
            setUser(userWithRole);
            setUserRole(currentUser.role as UserRole);
            localStorage.setItem('user', JSON.stringify(userWithRole));
          })
          .catch(() => {
            // Token invalid, clear storage
            authAPI.logout();
            setUser(null);
            setSession(null);
            setUserRole(null);
          })
          .finally(() => {
            setLoading(false);
          });
      } catch (error) {
        // Invalid stored data, clear it
        authAPI.logout();
        setUser(null);
        setSession(null);
        setUserRole(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const signUp = async (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    attempt: 'May 26' | 'Sept 26' | 'Jan 26';
    level: 'CA Inter' | 'CA Final';
    preparingFor: 'Group 1' | 'Group 2' | 'Both Groups';
    address: string;
  }) => {
    try {
      const response = await authAPI.register(data);
      // Don't auto-login after registration - user needs to verify email first
      return { error: null, message: response.message };
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await authAPI.login(email, password);
      const userData = {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role as UserRole,
      };
      setUser(userData);
      setSession({ token: data.token });
      setUserRole(data.role as UserRole);
      // Store in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(userData));

      // Navigate to appropriate dashboard based on user role
      const role = data.role as UserRole;
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'subadmin') {
        navigate('/subadmin');
      } else if (role === 'teacher') {
        navigate('/teacher');
      } else if (role === 'user') {
        navigate('/dashboard');
      }

      return { error: null, role: data.role as UserRole };
    } catch (error: any) {
      return { error: error as Error };
    }
  };



  const signOut = async () => {
    authAPI.logout();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
