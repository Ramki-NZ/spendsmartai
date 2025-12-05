import React, { useState, useEffect, useContext, createContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ScanPage from './pages/ScanPage';
import BudgetPage from './pages/BudgetPage';
import AdvisorPage from './pages/AdvisorPage';
import { User, Transaction, Budget, AuthContextType, DataContextType, ThemeContextType } from './types';

// --- Contexts ---
const AuthContext = createContext<AuthContextType>({} as AuthContextType);
const DataContext = createContext<DataContextType>({} as DataContextType);
const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const useAuth = () => useContext(AuthContext);
export const useData = () => useContext(DataContext);
export const useTheme = () => useContext(ThemeContext);

const App: React.FC = () => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('spendSmart_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string, name: string) => {
    const newUser = { id: '1', email, name };
    setUser(newUser);
    localStorage.setItem('spendSmart_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('spendSmart_user');
  };

  // --- Theme State ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (localStorage.getItem('theme')) return localStorage.getItem('theme') as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // --- Data State ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('spendSmart_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('spendSmart_budgets');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('spendSmart_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('spendSmart_budgets', JSON.stringify(budgets));
  }, [budgets]);

  // Data Actions
  const addTransaction = (t: Transaction) => setTransactions(prev => [...prev, t]);
  const updateTransaction = (updated: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
  };
  const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));
  
  const addBudget = (b: Budget) => setBudgets(prev => [...prev, b]);
  const updateBudget = (updated: Budget) => {
      setBudgets(prev => prev.map(b => b.category === updated.category ? updated : b));
  };

  const getSpendingByCategory = () => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type === 'EXPENSE') {
         const current = map.get(t.category) || 0;
         map.set(t.category, current + t.totalAmount);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  };

  const getSpendingByStore = () => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type === 'EXPENSE') {
         const current = map.get(t.store) || 0;
         map.set(t.store, current + t.totalAmount);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
        <DataContext.Provider value={{ 
            transactions, 
            budgets, 
            addTransaction, 
            updateTransaction,
            deleteTransaction, 
            addBudget, 
            updateBudget,
            getSpendingByCategory,
            getSpendingByStore
        }}>
          <Router>
            <Routes>
              {!user ? (
                 <Route path="*" element={<AuthPage />} />
              ) : (
                 <Route path="*" element={
                   <Layout>
                     <Routes>
                       <Route path="/" element={<Dashboard />} />
                       <Route path="/scan" element={<ScanPage />} />
                       <Route path="/budget" element={<BudgetPage />} />
                       <Route path="/advisor" element={<AdvisorPage />} />
                       <Route path="*" element={<Navigate to="/" replace />} />
                     </Routes>
                   </Layout>
                 } />
              )}
            </Routes>
          </Router>
        </DataContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
};

export default App;