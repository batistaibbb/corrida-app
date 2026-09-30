import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => { success: boolean; message: string };
  register: (data: Omit<User, 'id' | 'createdAt'>) => { success: boolean; message: string };
  logout: () => void;
  isAdmin: boolean;
  isParticipant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SEED_USERS: User[] = [
  {
    id: 'admin-001',
    name: 'Administrador RunBrasil',
    email: 'admin@runbrasil.com.br',
    password: 'admin123',
    role: 'admin',
    cpf: '000.000.000-00',
    phone: '(11) 4002-8922',
    createdAt: '2024-01-01',
  },
  {
    id: 'user-001',
    name: 'João Pereira',
    email: 'joao@email.com',
    password: '123456',
    role: 'participant',
    cpf: '123.456.789-00',
    phone: '(11) 99999-0001',
    createdAt: '2024-03-15',
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUsers = localStorage.getItem('rb_users');
    if (!storedUsers) {
      localStorage.setItem('rb_users', JSON.stringify(SEED_USERS));
    }

    const storedSession = localStorage.getItem('rb_session');
    if (storedSession) {
      setUser(JSON.parse(storedSession));
    }
  }, []);

  const getUsers = (): User[] => {
    const stored = localStorage.getItem('rb_users');
    return stored ? JSON.parse(stored) : SEED_USERS;
  };

  const saveUsers = (users: User[]) => {
    localStorage.setItem('rb_users', JSON.stringify(users));
  };

  const login = (email: string, password: string) => {
    const users = getUsers();
    const found = users.find(u => u.email === email && u.password === password);
    
    if (found) {
      setUser(found);
      localStorage.setItem('rb_session', JSON.stringify(found));
      return { success: true, message: 'Login realizado com sucesso!' };
    }
    return { success: false, message: 'E-mail ou senha incorretos.' };
  };

  const register = (data: Omit<User, 'id' | 'createdAt'>) => {
    const users = getUsers();
    const exists = users.find(u => u.email === data.email);
    
    if (exists) {
      return { success: false, message: 'Este e-mail já está cadastrado.' };
    }

    const newUser: User = {
      ...data,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);
    setUser(newUser);
    localStorage.setItem('rb_session', JSON.stringify(newUser));
    return { success: true, message: 'Conta criada com sucesso!' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rb_session');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAdmin: user?.role === 'admin',
        isParticipant: user?.role === 'participant',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
