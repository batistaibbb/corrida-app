export type UserRole = 'admin' | 'participant';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  cpf: string;
  phone: string;
  createdAt: string;
}

export interface Race {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  image: string;
  description: string;
  distances: { km: number; price: number }[];
  organizer: string;
  organizerId: string;
  participants: number;
  maxParticipants: number;
  category: string;
  sport: string;
  status: 'draft' | 'published' | 'open' | 'closed' | 'finished';
  includes: string[];
  rules: string[];
  rating: number;
  reviews: number;
  featured: boolean;
  discount?: number;
  tags: string[];
  createdAt: string;
}

export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface Payment {
  id: string;
  registrationId: string;
  method: PaymentMethod;
  amount: number;
  serviceFee: number;
  total: number;
  status: PaymentStatus;
  pixCode?: string;
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Registration {
  id: string;
  userId: string;
  raceId: string;
  distance: number;
  tshirtSize: string;
  status: 'pending_payment' | 'confirmed' | 'cancelled';
  paymentId?: string;
  confirmationCode: string;
  createdAt: string;
  emergencyName: string;
  emergencyPhone: string;
}
