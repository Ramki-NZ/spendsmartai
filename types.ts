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
  subCategory?: string;
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

export const SUGGESTED_CATEGORIES = [
  "Groceries", "Dining", "Transport", "Utilities", "Shopping", 
  "Entertainment", "Health", "Housing", "Education", 
  "Personal Care", "Travel", "Subscriptions", "Other"
];

export const SUB_CATEGORIES: Record<string, string[]> = {
  "Groceries": ["Produce", "Dairy & Eggs", "Meat & Seafood", "Bakery", "Pantry", "Frozen Foods", "Beverages", "Snacks", "Household"],
  "Dining": ["Fast Food", "Restaurants", "Coffee & Tea", "Bars", "Delivery"],
  "Transport": ["Fuel", "Public Transit", "Rideshare", "Parking", "Maintenance", "Air Travel", "Car Rental"],
  "Utilities": ["Electricity", "Water", "Gas", "Internet", "Phone", "Trash"],
  "Shopping": ["Clothing", "Shoes", "Electronics", "Home & Garden", "Beauty", "Sports", "Books", "Gifts"],
  "Entertainment": ["Movies", "Events", "Streaming", "Games", "Hobbies"],
  "Health": ["Doctors", "Pharmacy", "Fitness", "Therapy", "Dental"],
  "Housing": ["Rent", "Mortgage", "Repairs", "Furniture", "Decor", "Services"],
  "Education": ["Tuition", "Textbooks", "Courses", "Supplies"],
  "Personal Care": ["Hair", "Spa", "Nails", "Cosmetics"],
  "Travel": ["Hotels", "Flights", "Tours", "Transport"],
  "Subscriptions": ["Streaming Video", "Music", "Software", "Memberships"],
  "Other": ["Charity", "Taxes", "Fees", "Miscellaneous"]
};
