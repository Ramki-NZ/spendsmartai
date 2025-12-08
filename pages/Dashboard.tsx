import React, { useState, useMemo } from 'react';
import { useData } from '../App';
import TransactionCard from '../components/TransactionCard';
import TransactionModal from '../components/TransactionModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { TrendingDown, TrendingUp, CreditCard, Search, Filter, ArrowUpDown, PieChart as PieChartIcon } from 'lucide-react';
import { Transaction } from '../types';

const Dashboard: React.FC = () => {
  const { transactions, getSpendingByCategory, getSpendingByStore, updateTransaction, deleteTransaction } = useData();
  
  // State for filters and modal
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-high' | 'amount-low'>('date-desc');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const totalSpent = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const totalRecurring = transactions
    .filter(t => t.isRecurring)
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const categoryData = getSpendingByCategory();
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

  // Prepare Data for Monthly Spending Chart (Last 6 Months)
  const monthlySpendingData = useMemo(() => {
    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7); // YYYY-MM
        const label = d.toLocaleString('default', { month: 'short' });
        months.push({ key, label, amount: 0 });
    }

    transactions.forEach(t => {
        if (t.type === 'EXPENSE') {
            const tKey = t.date.slice(0, 7);
            const month = months.find(m => m.key === tKey);
            if (month) {
                month.amount += t.totalAmount;
            }
        }
    });
    return months;
  }, [transactions]);

  // Prepare Data for Top Stores
  const topStoresData = useMemo(() => {
    const storeData = getSpendingByStore();
    return storeData.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions, getSpendingByStore]);

  // Filter and Sort Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const matchesSearch = t.store.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              t.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount-high') return b.totalAmount - a.totalAmount;
        if (sortBy === 'amount-low') return a.totalAmount - b.totalAmount;
        return 0;
      });
  }, [transactions, searchTerm, categoryFilter, sortBy]);

  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category))).sort();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <TrendingDown size={24} />
            </div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Spent</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">${totalSpent.toFixed(2)}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Recurring / Monthly</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">${totalRecurring.toFixed(2)}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3 mb-2">
             <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CreditCard size={24} />
            </div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Transactions</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{transactions.length}</p>
        </div>
      </div>

      {/* Monthly Spending Bar Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Monthly Spending History</h2>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySpendingData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: 'rgb(15 23 42)', borderColor: 'rgb(30 41 59)', color: 'white', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
                    />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 min-h-[400px]">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Spending by Category</h2>
          {categoryData.length > 0 ? (
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    contentStyle={{ backgroundColor: 'rgb(15 23 42)', borderColor: 'rgb(30 41 59)', color: 'white', borderRadius: '8px' }}
                    itemStyle={{ color: 'white' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {categoryData.slice(0, 6).map((c, idx) => (
                    <div key={idx} className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                      <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      {c.name}
                    </div>
                  ))}
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
               <PieChartIcon size={48} className="mb-2 opacity-20"/>
               <p>No spending data yet</p>
             </div>
          )}
        </div>

        {/* Top Stores Horizontal Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 min-h-[400px]">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Top Spending by Store</h2>
          {topStoresData.length > 0 ? (
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={topStoresData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                        <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={80} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: 'rgb(15 23 42)', borderColor: 'rgb(30 41 59)', color: 'white', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`]}
                        />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                </ResponsiveContainer>
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
                <CreditCard size={48} className="mb-2 opacity-20" />
                <p>No store data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Transactions Section with Filters */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Recent Transactions</h2>
            
            {/* Filter Toolbar */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        aria-label="Search transactions"
                        placeholder="Search items..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none w-40 md:w-64"
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <select 
                        aria-label="Filter by category"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                    >
                        <option value="">All Categories</option>
                        {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="relative">
                    <ArrowUpDown className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <select 
                        aria-label="Sort transactions"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                    >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="amount-high">Amount (High to Low)</option>
                        <option value="amount-low">Amount (Low to High)</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                    <TransactionCard 
                        key={t.id} 
                        transaction={t} 
                        onClick={() => setSelectedTransaction(t)}
                    />
                ))
            ) : (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                    <p>No transactions match your search.</p>
                </div>
            )}
        </div>
      </div>

      {/* Transaction Modal */}
      {selectedTransaction && (
          <TransactionModal 
            transaction={selectedTransaction} 
            onClose={() => setSelectedTransaction(null)}
            onSave={(updated) => updateTransaction(updated)}
            onDelete={(id) => deleteTransaction(id)}
          />
      )}
    </div>
  );
};

export default Dashboard;