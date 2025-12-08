import { createContext, useContext } from 'react';
import { AuthContextType, DataContextType, ThemeContextType } from '../types';

// Create Contexts
export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const DataContext = createContext<DataContextType>({} as DataContextType);
export const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

// Export Hooks
export const useAuth = () => useContext(AuthContext);
export const useData = () => useContext(DataContext);
export const useTheme = () => useContext(ThemeContext);