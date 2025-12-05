export interface User {
  id: string;
  name: string;
  email: string;
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

export interface Item {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface Transaction {
  id: string;
  date: string;
  store: string;
  totalAmount: number;
  category: string;
  items: Item[];
  type: TransactionType;
  isRecurring: boolean;
  source: 'RECEIPT' | 'STATEMENT' | 'MANUAL';
  receiptImage?: string; // Base64
}

export interface Budget {
  category: string;
  limit: number;
}

export interface AppState {
  user: User | null;
  transactions: Transaction[];
  budgets: Budget[];
  isAuthenticated: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, name: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface DataContextType {
  transactions: Transaction[];
  budgets: Budget[];
  addTransaction: (t: Transaction) => void;
  updateTransaction: (t: Transaction) => void;
  addBudget: (b: Budget) => void;
  updateBudget: (b: Budget) => void;
  deleteTransaction: (id: string) => void;
  getSpendingByCategory: () => { name: string; value: number }[];
  getSpendingByStore: () => { name: string; value: number }[];
}