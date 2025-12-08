import React from 'react';
import { Home, ScanLine, PieChart, Sparkles, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth, useTheme } from '../pages/contexts'; // Updated Import
import { Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path 
    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800';

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
    <Link
      to={to}
      onClick={() => setIsMobileMenuOpen(false)}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive(to)}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed h-full z-10 transition-colors duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            SpendSmartAI
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Welcome, {user?.name}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem to="/" icon={Home} label="Dashboard" />
          <NavItem to="/scan" icon={ScanLine} label="Scan & Upload" />
          <NavItem to="/budget" icon={PieChart} label="Budget & Analysis" />
          <NavItem to="/advisor" icon={Sparkles} label="Smart Advisor" />
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button 
            onClick={toggleTheme}
            className="flex items-center space-x-3 px-4 py-3 w-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          <button 
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-3 w-full text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-20 flex justify-between items-center p-4 transition-colors duration-200">
         <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            SpendSmartAI
          </h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-700 dark:text-slate-200">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white dark:bg-slate-900 z-10 pt-20 px-4 space-y-2 transition-colors duration-200">
           <NavItem to="/" icon={Home} label="Dashboard" />
          <NavItem to="/scan" icon={ScanLine} label="Scan & Upload" />
          <NavItem to="/budget" icon={PieChart} label="Budget & Analysis" />
          <NavItem to="/advisor" icon={Sparkles} label="Smart Advisor" />
          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-4 space-y-2">
            <button 
              onClick={toggleTheme}
              className="flex items-center space-x-3 px-4 py-3 w-full text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button 
              onClick={logout}
              className="flex items-center space-x-3 px-4 py-3 w-full text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;