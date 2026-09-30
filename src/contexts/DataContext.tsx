import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Race, Registration, Payment } from '../types';
import { races as seedRaces } from '../data/races';

interface DataContextType {
  races: Race[];
  registrations: Registration[];
  payments: Payment[];
  addRace: (race: Omit<Race, 'id' | 'createdAt' | 'rating' | 'reviews' | 'participants'>) => void;
  updateRace: (id: string, data: Partial<Race>) => void;
  deleteRace: (id: string) => void;
  addRegistration: (reg: Omit<Registration, 'id' | 'createdAt' | 'confirmationCode'>) => string;
  updateRegistration: (id: string, data: Partial<Registration>) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => string;
  approvePayment: (paymentId: string) => void;
  getRegistrationByUser: (userId: string) => Registration[];
  getPaymentByRegistration: (registrationId: string) => Payment | undefined;
  getRaceById: (id: string) => Race | undefined;
  getStats: () => { totalEvents: number; totalRegistrations: number; totalRevenue: number; pendingPayments: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

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

export function DataProvider({ children }: { children: ReactNode }) {
  const [races, setRaces] = useState<Race[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const storedRaces = localStorage.getItem('rb_races');
    const storedRegs = localStorage.getItem('rb_registrations');
    const storedPays = localStorage.getItem('rb_payments');

    setRaces(storedRaces ? JSON.parse(storedRaces) : seedRaces);
    setRegistrations(storedRegs ? JSON.parse(storedRegs) : SEED_REGISTRATIONS);
    setPayments(storedPays ? JSON.parse(storedPays) : SEED_PAYMENTS);
  }, []);

  useEffect(() => {
    if (races.length > 0) localStorage.setItem('rb_races', JSON.stringify(races));
  }, [races]);

  useEffect(() => {
    localStorage.setItem('rb_registrations', JSON.stringify(registrations));
  }, [registrations]);

  useEffect(() => {
    localStorage.setItem('rb_payments', JSON.stringify(payments));
  }, [payments]);

  const addRace = (race: Omit<Race, 'id' | 'createdAt' | 'rating' | 'reviews' | 'participants'>) => {
    const newRace: Race = {
      ...race,
      id: `race-${Date.now()}`,
      createdAt: new Date().toISOString(),
      rating: 0,
      reviews: 0,
      participants: 0,
    };
    setRaces(prev => [...prev, newRace]);
  };

  const updateRace = (id: string, data: Partial<Race>) => {
    setRaces(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const deleteRace = (id: string) => {
    setRaces(prev => prev.filter(r => r.id !== id));
  };

  const addRegistration = (reg: Omit<Registration, 'id' | 'createdAt' | 'confirmationCode'>): string => {
    const id = `reg-${Date.now()}`;
    const confirmationCode = `RB${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const newReg: Registration = {
      ...reg,
      id,
      confirmationCode,
      createdAt: new Date().toISOString(),
    };
    setRegistrations(prev => [...prev, newReg]);
    return id;
  };

  const updateRegistration = (id: string, data: Partial<Registration>) => {
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const addPayment = (payment: Omit<Payment, 'id' | 'createdAt'>): string => {
    const id = `pay-${Date.now()}`;
    const newPay: Payment = {
      ...payment,
      id,
      createdAt: new Date().toISOString(),
    };
    setPayments(prev => [...prev, newPay]);
    return id;
  };

  const approvePayment = (paymentId: string) => {
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

  return (
    <DataContext.Provider
      value={{
        races,
        registrations,
        payments,
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
