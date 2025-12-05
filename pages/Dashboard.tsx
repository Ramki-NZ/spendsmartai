import React from 'react';
import { useData } from '../App';
import TransactionCard from '../components/TransactionCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingDown, TrendingUp, CreditCard } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { transactions, getSpendingByCategory } = useData();

  const totalSpent = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const totalRecurring = transactions
    .filter(t => t.isRecurring)
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const categoryData = getSpendingByCategory();
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    contentStyle={{ backgroundColor: 'rgb(15 23 42)', borderColor: 'rgb(30 41 59)', color: 'white' }}
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
               <PieChart size={48} className="mb-2 opacity-20"/>
               <p>No spending data yet</p>
             </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Recent Transactions</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {transactions.length > 0 ? (
               transactions.slice().reverse().slice(0, 10).map((t) => (
                 <TransactionCard key={t.id} transaction={t} />
               ))
            ) : (
              <p className="text-slate-400 dark:text-slate-600 text-center py-10">No transactions recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;