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
  distances: RaceDistance[];
  organizer: string;
  organizerId: string;
  participants: number;
  maxParticipants: number;
  category: string;
  sport: string;
  // Status de publicação (visibilidade)
  published: boolean;
  // Status de inscrição (temporal)
  registrationStatus: 'upcoming' | 'closed' | 'finished';
  includes: string[];
  rules: string[];
  rating: number;
  reviews: number;
  featured: boolean;
  discount?: number;
  tags: string[];
  createdAt: string;
  // Kits disponíveis para inscrição
  kits?: RaceKit[];
  // Tamanhos de camisa disponíveis
  shirtSizes?: string[];
  // PDF com regulamento/detalhes
  regulationPdf?: string;
  // Mapa do percurso (URL da imagem)
  routeMap?: string;
  // Auditoria UX G7: informações de retirada do kit exibidas no comprovante
  kitPickup?: string;
  kitPickupLocation?: string;
}

export interface RaceDistance {
  km: number;
  price: number;
  name?: string; // Ex: "Corrida", "Caminhada"
  description?: string;
  kitId?: string; // Vincular a um kit específico (opcional)
}

export interface RaceKit {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  includes: string[];
  distance?: number; // km (0 para caminhada)
  distanceIds?: string[]; // IDs das distâncias vinculadas (opcional)
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
  distanceId?: string; // ID da distância selecionada
  tshirtSize: string;
  kitId?: string; // ID do kit selecionado
  kitName?: string; // Nome do kit selecionado
  price?: number; // Preço cobrado (preço do kit escolhido)
  status: 'pending_payment' | 'confirmed' | 'cancelled';
  paymentId?: string;
  confirmationCode: string;
  createdAt: string;
  emergencyName: string;
  emergencyPhone: string;
  // Dados do participante coletados no formulário de inscrição
  // (persistidos na inscrição para o relatório admin não depender do perfil)
  participantFirstName?: string;
  participantLastName?: string;
  participantEmail?: string;
  participantPhone?: string;
  participantCpf?: string;
  // Menor de idade: consentimento do responsavel legal coletado no checkout
  isMinor?: boolean;
  responsibleName?: string;
  responsibleCpf?: string;
  // Dados pessoais e aceite (migration 009)
  birthDate?: string;
  gender?: string;
  address?: string;
  addressCity?: string;
  addressState?: string;
  zipCode?: string;
  termsAcceptedAt?: string;
  medicalDeclarationAt?: string;
}
