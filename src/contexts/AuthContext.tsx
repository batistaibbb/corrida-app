import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase, isDemoMode } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: Omit<User, 'id' | 'createdAt'>) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    if (!supabase) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        console.error('Error loading profile:', error);
        return;
      }

      setUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        password: '',
        role: profile.role,
        cpf: profile.cpf || '',
        phone: profile.phone || '',
        createdAt: profile.created_at,
      });
    } catch (err) {
      console.error('Error in loadUserProfile:', err);
    }
  };

  useEffect(() => {
    let subscription: any = null;

    const initAuth = async () => {
      if (!isDemoMode && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await loadUserProfile(session.user.id);
          }

          const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              await loadUserProfile(session.user.id);
            } else {
              setUser(null);
            }
            setLoading(false);
          });

          subscription = data.subscription;
        } catch (err) {
          console.error('Error initializing auth:', err);
        }
        setLoading(false);
      } else {
        const storedUsers = localStorage.getItem('rb_users');
        if (!storedUsers) {
          localStorage.setItem('rb_users', JSON.stringify(SEED_USERS));
        }

        const storedSession = localStorage.getItem('rb_session');
        if (storedSession) {
          setUser(JSON.parse(storedSession));
        }
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const getUsers = (): User[] => {
    const stored = localStorage.getItem('rb_users');
    return stored ? JSON.parse(stored) : SEED_USERS;
  };

  const saveUsers = (users: User[]) => {
    localStorage.setItem('rb_users', JSON.stringify(users));
  };

  const login = async (email: string, password: string) => {
    if (!isDemoMode && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, message: error.message };
        }

        if (data.user) {
          await loadUserProfile(data.user.id);
          return { success: true, message: 'Login realizado com sucesso!' };
        }

        return { success: false, message: 'Erro ao fazer login' };
      } catch (err) {
        console.error('Error in login:', err);
        return { success: false, message: 'Erro ao fazer login' };
      }
    }

    const users = getUsers();
    const found = users.find(u => u.email === email && u.password === password);
    
    if (found) {
      setUser(found);
      localStorage.setItem('rb_session', JSON.stringify(found));
      return { success: true, message: 'Login realizado com sucesso!' };
    }
    return { success: false, message: 'E-mail ou senha incorretos.' };
  };

  const register = async (data: Omit<User, 'id' | 'createdAt'>) => {
    if (!isDemoMode && supabase) {
      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name,
              role: data.role,
            },
          },
        });

        if (error) {
          return { success: false, message: error.message };
        }

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: data.email,
              name: data.name,
              role: data.role,
              cpf: data.cpf,
              phone: data.phone,
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
          }

          await loadUserProfile(authData.user.id);
          return { success: true, message: 'Conta criada com sucesso!' };
        }

        return { success: false, message: 'Erro ao criar conta' };
      } catch (err) {
        console.error('Error in register:', err);
        return { success: false, message: 'Erro ao criar conta' };
      }
    }

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

  const logout = async () => {
    if (!isDemoMode && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error in logout:', err);
      }
    }

    setUser(null);
    localStorage.removeItem('rb_session');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

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
