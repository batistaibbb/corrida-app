import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Race, Registration, Payment } from '../types';
import { supabase, isDemoMode } from '../lib/supabase';
import { races as seedRaces } from '../data/races';

interface DataContextType {
  races: Race[];
  registrations: Registration[];
  payments: Payment[];
  loading: boolean;
  addRace: (race: Omit<Race, 'id' | 'createdAt' | 'rating' | 'reviews' | 'participants'>) => Promise<void>;
  updateRace: (id: string, data: Partial<Race>) => Promise<void>;
  deleteRace: (id: string) => Promise<void>;
  addRegistration: (reg: Omit<Registration, 'id' | 'createdAt' | 'confirmationCode'>) => Promise<string>;
  updateRegistration: (id: string, data: Partial<Registration>) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Promise<string>;
  approvePayment: (paymentId: string) => Promise<void>;
  getRegistrationByUser: (userId: string) => Registration[];
  getPaymentByRegistration: (registrationId: string) => Payment | undefined;
  getRaceById: (id: string) => Race | undefined;
  getStats: () => { totalEvents: number; totalRegistrations: number; totalRevenue: number; pendingPayments: number };
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Seed data para modo demo
const SEED_REGISTRATIONS: Registration[] = [
  {
    id: 'reg-001',
    userId: 'user-001',
    raceId: 'corrida-sao-silvestre-2026',
    distance: 10,
    tshirtSize: 'M',
    status: 'confirmed',
    paymentId: 'pay-001',
    confirmationCode: 'RB8X7K2M9P',
    createdAt: '2025-11-10',
    emergencyName: 'Ana Pereira',
    emergencyPhone: '(11) 98888-0001',
  },
];

const SEED_PAYMENTS: Payment[] = [
  {
    id: 'pay-001',
    registrationId: 'reg-001',
    method: 'pix',
    amount: 249.90,
    serviceFee: 12.50,
    total: 262.40,
    status: 'approved',
    transactionId: 'MP-TXN-001',
    paidAt: '2025-11-10T14:30:00',
    createdAt: '2025-11-10T14:25:00',
  },
];

// Função para converter formato do Supabase para o app
function convertRaceFromSupabase(race: any): Race {
  return {
    id: race.id,
    name: race.name,
    date: race.date,
    time: race.time,
    location: race.location,
    city: race.city,
    state: race.state,
    image: race.image_url || race.image,
    description: race.description,
    organizer: race.organizer_name || race.organizer,
    organizerId: race.organizer_id || race.organizerId,
    participants: race.participants_count || race.participants || 0,
    maxParticipants: race.max_participants || race.maxParticipants || 1000,
    category: race.category,
    sport: race.sport,
    published: race.published ?? false,
    registrationStatus: race.registration_status || race.registrationStatus || 'upcoming',
    includes: race.includes || [],
    rules: race.rules || [],
    rating: race.rating || 0,
    reviews: race.reviews_count || race.reviews || 0,
    featured: race.featured || false,
    discount: race.discount || 0,
    tags: race.tags || [],
    distances: race.distances || [],
    createdAt: race.created_at || race.createdAt,
  };
}

function convertRegistrationFromSupabase(reg: any): Registration {
  return {
    id: reg.id,
    userId: reg.user_id || reg.userId,
    raceId: reg.race_id || reg.raceId,
    distance: reg.distance,
    tshirtSize: reg.tshirt_size || reg.tshirtSize,
    status: reg.status,
    paymentId: reg.payment_id || reg.paymentId,
    confirmationCode: reg.confirmation_code || reg.confirmationCode,
    emergencyName: reg.emergency_name || reg.emergencyName,
    emergencyPhone: reg.emergency_phone || reg.emergencyPhone,
    createdAt: reg.created_at || reg.createdAt,
  };
}

function convertPaymentFromSupabase(payment: any): Payment {
  return {
    id: payment.id,
    registrationId: payment.registration_id || payment.registrationId,
    method: payment.method,
    amount: payment.amount,
    serviceFee: payment.service_fee || payment.serviceFee,
    total: payment.total,
    status: payment.status,
    pixCode: payment.pix_code || payment.pixCode,
    transactionId: payment.transaction_id || payment.transactionId,
    paidAt: payment.paid_at || payment.paidAt,
    createdAt: payment.created_at || payment.createdAt,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [races, setRaces] = useState<Race[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados do Supabase ou localStorage (fallback)
  const loadRaces = async () => {
    if (!isDemoMode && supabase) {
      try {
        const { data, error } = await supabase
          .from('races')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Erro ao carregar eventos:', error);
          // Fallback para seed data
          setRaces(seedRaces);
          return;
        }
        
        if (data && data.length > 0) {
          setRaces(data.map(convertRaceFromSupabase));
        } else {
          // Se não há dados no Supabase, usar seed data
          setRaces(seedRaces);
        }
      } catch (err) {
        console.error('Erro ao carregar eventos:', err);
        setRaces(seedRaces);
      }
    } else {
      // Modo demo: usar localStorage
      const storedRaces = localStorage.getItem('rb_races');
      setRaces(storedRaces ? JSON.parse(storedRaces) : seedRaces);
    }
  };

  const loadRegistrations = async () => {
    if (!isDemoMode && supabase) {
      try {
        const { data, error } = await supabase
          .from('registrations')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Erro ao carregar inscrições:', error);
          setRegistrations([]);
          return;
        }
        
        setRegistrations((data || []).map(convertRegistrationFromSupabase));
      } catch (err) {
        console.error('Erro ao carregar inscrições:', err);
        setRegistrations([]);
      }
    } else {
      const storedRegs = localStorage.getItem('rb_registrations');
      setRegistrations(storedRegs ? JSON.parse(storedRegs) : SEED_REGISTRATIONS);
    }
  };

  const loadPayments = async () => {
    if (!isDemoMode && supabase) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Erro ao carregar pagamentos:', error);
          setPayments([]);
          return;
        }
        
        setPayments((data || []).map(convertPaymentFromSupabase));
      } catch (err) {
        console.error('Erro ao carregar pagamentos:', err);
        setPayments([]);
      }
    } else {
      const storedPays = localStorage.getItem('rb_payments');
      setPayments(storedPays ? JSON.parse(storedPays) : SEED_PAYMENTS);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([loadRaces(), loadRegistrations(), loadPayments()]);
    setLoading(false);
  };

  // Carregar dados inicialmente e configurar Realtime
  useEffect(() => {
    refreshData();

    // Se Supabase está configurado, habilitar Realtime
    if (!isDemoMode && supabase) {
      const racesChannel = supabase
        .channel('races-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'races' },
          () => {
            console.log('🔄 Mudança detectada em races - recarregando...');
            loadRaces();
          }
        )
        .subscribe();

      const registrationsChannel = supabase
        .channel('registrations-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'registrations' },
          () => {
            console.log('🔄 Mudança detectada em registrations - recarregando...');
            loadRegistrations();
          }
        )
        .subscribe();

      const paymentsChannel = supabase
        .channel('payments-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'payments' },
          () => {
            console.log('🔄 Mudança detectada em payments - recarregando...');
            loadPayments();
          }
        )
        .subscribe();

      return () => {
        if (supabase) {
          supabase.removeChannel(racesChannel);
          supabase.removeChannel(registrationsChannel);
          supabase.removeChannel(paymentsChannel);
        }
      };
    } else {
      // Modo demo: sincronizar entre abas via localStorage
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'rb_races' || e.key === 'rb_registrations' || e.key === 'rb_payments') {
          refreshData();
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  // Salvar no localStorage quando em modo demo
  useEffect(() => {
    if (isDemoMode && races.length > 0) {
      localStorage.setItem('rb_races', JSON.stringify(races));
    }
  }, [races]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem('rb_registrations', JSON.stringify(registrations));
    }
  }, [registrations]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem('rb_payments', JSON.stringify(payments));
    }
  }, [payments]);

  // CRUD Operations
  const addRace = async (race: Omit<Race, 'id' | 'createdAt' | 'rating' | 'reviews' | 'participants'>) => {
    if (!isDemoMode && supabase) {
      const { error } = await supabase
        .from('races')
        .insert({
          name: race.name,
          date: race.date,
          time: race.time,
          location: race.location,
          city: race.city,
          state: race.state,
          image_url: race.image,
          description: race.description,
          organizer_id: race.organizerId,
          organizer_name: race.organizer,
          max_participants: race.maxParticipants,
          category: race.category,
          sport: race.sport,
          published: race.published,
          registration_status: race.registrationStatus,
          includes: race.includes,
          rules: race.rules,
          featured: race.featured,
          discount: race.discount,
          tags: race.tags,
          distances: race.distances,
        });
      
      if (error) throw error;
      await loadRaces();
    } else {
      const newRace: Race = {
        ...race,
        id: `race-${Date.now()}`,
        createdAt: new Date().toISOString(),
        rating: 0,
        reviews: 0,
        participants: 0,
      };
      setRaces(prev => [...prev, newRace]);
    }
  };

  const updateRace = async (id: string, data: Partial<Race>) => {
    if (!isDemoMode && supabase) {
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.date !== undefined) updateData.date = data.date;
      if (data.time !== undefined) updateData.time = data.time;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.image !== undefined) updateData.image_url = data.image;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.maxParticipants !== undefined) updateData.max_participants = data.maxParticipants;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.sport !== undefined) updateData.sport = data.sport;
      if (data.published !== undefined) updateData.published = data.published;
      if (data.registrationStatus !== undefined) updateData.registration_status = data.registrationStatus;
      if (data.includes !== undefined) updateData.includes = data.includes;
      if (data.rules !== undefined) updateData.rules = data.rules;
      if (data.featured !== undefined) updateData.featured = data.featured;
      if (data.discount !== undefined) updateData.discount = data.discount;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.distances !== undefined) updateData.distances = data.distances;
      
      const { error } = await supabase
        .from('races')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      await loadRaces();
    } else {
      setRaces(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    }
  };

  const deleteRace = async (id: string) => {
    if (!isDemoMode && supabase) {
      const { error } = await supabase
        .from('races')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadRaces();
    } else {
      setRaces(prev => prev.filter(r => r.id !== id));
    }
  };

  const addRegistration = async (reg: Omit<Registration, 'id' | 'createdAt' | 'confirmationCode'>): Promise<string> => {
    const confirmationCode = `RB${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    
    if (!isDemoMode && supabase) {
      const { data, error } = await supabase
        .from('registrations')
        .insert({
          user_id: reg.userId,
          race_id: reg.raceId,
          distance: reg.distance,
          tshirt_size: reg.tshirtSize,
          status: reg.status,
          confirmation_code: confirmationCode,
          emergency_name: reg.emergencyName,
          emergency_phone: reg.emergencyPhone,
        })
        .select()
        .single();
      
      if (error) throw error;
      await loadRegistrations();
      return data.id;
    } else {
      const id = `reg-${Date.now()}`;
      const newReg: Registration = {
        ...reg,
        id,
        confirmationCode,
        createdAt: new Date().toISOString(),
      };
      setRegistrations(prev => [...prev, newReg]);
      return id;
    }
  };

  const updateRegistration = async (id: string, data: Partial<Registration>) => {
    if (!isDemoMode && supabase) {
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (data.status !== undefined) updateData.status = data.status;
      if (data.paymentId !== undefined) updateData.payment_id = data.paymentId;
      
      const { error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      await loadRegistrations();
    } else {
      setRegistrations(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    }
  };

  const addPayment = async (payment: Omit<Payment, 'id' | 'createdAt'>): Promise<string> => {
    if (!isDemoMode && supabase) {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          registration_id: payment.registrationId,
          method: payment.method,
          amount: payment.amount,
          service_fee: payment.serviceFee,
          total: payment.total,
          status: payment.status,
          pix_code: payment.pixCode,
          transaction_id: payment.transactionId,
          paid_at: payment.paidAt,
        })
        .select()
        .single();
      
      if (error) throw error;
      await loadPayments();
      return data.id;
    } else {
      const id = `pay-${Date.now()}`;
      const newPay: Payment = {
        ...payment,
        id,
        createdAt: new Date().toISOString(),
      };
      setPayments(prev => [...prev, newPay]);
      return id;
    }
  };

  const approvePayment = async (paymentId: string) => {
    if (!isDemoMode && supabase) {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'approved',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      
      if (error) throw error;
      
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        await updateRegistration(payment.registrationId, {
          status: 'confirmed',
          paymentId: payment.id,
        });
      }
      
      await loadPayments();
    } else {
      setPayments(prev => prev.map(p => 
        p.id === paymentId 
          ? { ...p, status: 'approved' as const, paidAt: new Date().toISOString() } 
          : p
      ));
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        setRegistrations(prev => prev.map(r => 
          r.id === payment.registrationId 
            ? { ...r, status: 'confirmed' as const, paymentId } 
            : r
        ));
      }
    }
  };

  const getRegistrationByUser = (userId: string) => 
    registrations.filter(r => r.userId === userId);

  const getPaymentByRegistration = (registrationId: string) =>
    payments.find(p => p.registrationId === registrationId);

  const getRaceById = (id: string) => races.find(r => r.id === id);

  const getStats = () => {
    const approvedPayments = payments.filter(p => p.status === 'approved');
    return {
      totalEvents: races.length,
      totalRegistrations: registrations.length,
      totalRevenue: approvedPayments.reduce((sum, p) => sum + p.total, 0),
      pendingPayments: payments.filter(p => p.status === 'pending').length,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Carregando dados...</p>
          <p className="text-xs text-slate-400 mt-2">
            {isDemoMode ? 'Modo Demo' : 'Conectado ao Supabase'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DataContext.Provider
      value={{
        races,
        registrations,
        payments,
        loading,
        addRace,
        updateRace,
        deleteRace,
        addRegistration,
        updateRegistration,
        addPayment,
        approvePayment,
        getRegistrationByUser,
        getPaymentByRegistration,
        getRaceById,
        getStats,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
