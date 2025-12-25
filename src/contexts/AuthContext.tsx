import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'teacher' | 'student';
export type PaymentStatus = 'pending' | 'approved' | 'blocked';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  paymentStatus: PaymentStatus;
  deviceId?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: Record<string, { password: string; user: User }> = {
  'admin@learnbox.uz': {
    password: 'admin123',
    user: {
      id: '1',
      email: 'admin@learnbox.uz',
      name: 'Admin User',
      role: 'admin',
      paymentStatus: 'approved',
    },
  },
  'teacher@learnbox.uz': {
    password: 'teacher123',
    user: {
      id: '2',
      email: 'teacher@learnbox.uz',
      name: 'John Teacher',
      role: 'teacher',
      paymentStatus: 'approved',
    },
  },
  'student@learnbox.uz': {
    password: 'student123',
    user: {
      id: '3',
      email: 'student@learnbox.uz',
      name: 'Alex Student',
      role: 'student',
      paymentStatus: 'approved',
    },
  },
  'pending@learnbox.uz': {
    password: 'pending123',
    user: {
      id: '4',
      email: 'pending@learnbox.uz',
      name: 'Pending User',
      role: 'student',
      paymentStatus: 'pending',
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    const userData = mockUsers[email];
    if (userData && userData.password === password) {
      setUser(userData.user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
