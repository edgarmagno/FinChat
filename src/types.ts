export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id?: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Date;
  rawMessage?: string;
  createdAt: Date;
}

export interface ChatMessage {
  id?: string;
  userId: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  transactionId?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  currency: string;
  categories: string[];
  role: 'admin' | 'user';
  createdAt: Date;
}

export const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Lazer',
  'Saúde',
  'Salário',
  'Investimento',
  'Outros'
];
