import React, { useState, useMemo } from 'react';
import { useData } from '../contexts';
import { Budget, Transaction } from '../types';
import { Plus, CheckCircle, AlertTriangle, Repeat, Calendar, DollarSign, ShoppingBag } from 'lucide-react';

const BudgetPage: React.FC = () => {
  const { budgets, transactions, addBudget, updateBudget } = useData();
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory || !newLimit) return;
    
    // Check if exists
    const existing = budgets.find((b: Budget) => b.category.toLowerCase() === newCategory.toLowerCase());
    if (existing) {
        updateBudget({ ...existing, limit: parseFloat(newLimit) });
    } else {
        addBudget({ category: newCategory, limit: parseFloat(newLimit) });
    }
    setNewCategory('');
    setNewLimit('');
  };

  const getSpentForCategory = (cat: string) => {
    return transactions
      .filter((t: Transaction) => t.category.toLowerCase() === cat.toLowerCase() && t.type === 'EXPENSE')
      .reduce((sum: number, t: Transaction) => sum + t.totalAmount, 0);
  };

  // Group recurring transactions to estimate monthly costs
  const recurringGroups = transactions
    .filter((t: Transaction) => t.isRecurring)
    .reduce((groups: Record<string, Transaction>, t: Transaction) => {
        // Group by normalized store name to find the latest occurrence
        const key = t.store.toLowerCase().trim();
        if (!groups[key] || new Date(t.date) > new Date(groups[key].date)) {
            groups[key] = t;
        }
        return groups;
    }, {} as Record<string, Transaction>);

  const recurringList = Object.values(recurringGroups).sort((a: Transaction, b: Transaction) => b.totalAmount - a.totalAmount);
  const totalRecurringMonthly = recurringList.reduce((sum: number, t: Transaction) => sum + t.totalAmount, 0);

  // Calculate item breakdown grouped by category
  const itemBreakdown = useMemo(() => {
    const breakdown: Record<string, Record<string, { quantity: number; total: number }>> = {};

    transactions.forEach((t: Transaction) => {
      if (t.type === 'EXPENSE' && t.items && t.items.length > 0) {
        t.items.forEach((item: any) => {
           // Use item category if available, otherwise transaction category, fallback to 'Other'
           const category = item.category || t.category || 'Other';
           const name = item.name.trim();
           
           if (!breakdown[category]) {
             breakdown[category] = {};
           }
           
           if (!breakdown[category][name]) {
             breakdown[category][name] = { quantity: 0, total: 0 };
           }
           
           breakdown[category][name].quantity += item.quantity;
           breakdown[category][name].total += item.totalPrice;
        });
      }
    });

    return breakdown;
  }, [transactions]);

  return (
    <div className="space-y-8">
      
      {/* Budget Overview Section */}
      <section>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
          <div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Budget Planner</h2>
             <p className="text-slate-500 dark:text-slate-400">Track your spending limits per category.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
          <form onSubmit={handleAddBudget} className="flex gap-4 items-end">
             <div className="flex-1">
               <label htmlFor="budget-category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category Name</label>
               <input 
                 id="budget-category"
                 type="text" 
                 className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
                 placeholder="e.g. Groceries"
                 value={newCategory}
                 onChange={e => setNewCategory(e.target.value)}
               />
             </div>
             <div className="w-32">
               <label htmlFor="budget-limit" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monthly Limit ($)</label>
               <input 
                 id="budget-limit"
                 type="number" 
                 className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
                 placeholder="500"
                 value={newLimit}
                 onChange={e => setNewLimit(e.target.value)}
               />
             </div>
             <button type="submit" aria-label="Add Budget" className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
               <Plus size={24} />
             </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {budgets.map((budget: Budget, idx: number) => {
             const spent = getSpentForCategory(budget.category);
             const percentage = Math.min((spent / budget.limit) * 100, 100);
             
             let statusColor = "bg-green-500";
             let textColor = "text-green-600 dark:text-green-400";
             let StatusIcon = CheckCircle;
             let statusText = "On Track";

             if (percentage >= 100) {
               statusColor = "bg-red-500";
               textColor = "text-red-600 dark:text-red-400";
               StatusIcon = AlertTriangle;
               statusText = "Exceeded";
             } else if (percentage > 85) {
               statusColor = "bg-orange-500";
               textColor = "text-orange-600 dark:text-orange-400";
               StatusIcon = AlertTriangle;
               statusText = "Nearing Limit";
             }

             return (
               <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3">
                     <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{budget.category}</h3>
                     <div className={`flex items-center text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-opacity-10 dark:bg-opacity-20 ${textColor} bg-current`}>
                        <StatusIcon size={14} className="mr-1" />
                        {statusText}
                     </div>
                  </div>
                  
                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mb-2">
                     <span>Spent: <span className="text-slate-900 dark:text-slate-200 font-semibold">${spent.toFixed(2)}</span></span>
                     <span>Limit: <span className="text-slate-700 dark:text-slate-300 font-medium">${budget.limit.toFixed(2)}</span></span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out ${statusColor}`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
               </div>
             );
           })}

           {budgets.length === 0 && (
             <div className="col-span-full bg-slate-50 dark:bg-slate-900 rounded-xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
               <ShoppingBag size={48} className="mx-auto mb-3 opacity-20" />
               <p className="text-slate-500 dark:text-slate-400">No budgets set yet. Add a category above to start tracking.</p>
             </div>
           )}
        </div>
      </section>

      {/* Recurring Expenses Section */}
      <section>
         <div className="flex items-center justify-between mb-4">
             <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                    <Repeat className="mr-2 text-indigo-600 dark:text-indigo-400" size={24}/>
                    Recurring Expenses & Subscriptions
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active recurring bills identified from your transactions.</p>
             </div>
             <div className="text-right">
                 <p className="text-xs text-slate-500 dark:text-slate-400">Est. Monthly Cost</p>
                 <p className="text-2xl font-bold text-slate-900 dark:text-white">${totalRecurringMonthly.toFixed(2)}</p>
             </div>
         </div>

         <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {recurringList.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recurringList.map((t: Transaction) => (
                        <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t.store}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.category} • Last paid: {t.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-slate-900 dark:text-white">${t.totalAmount.toFixed(2)}</span>
                                <span className="text-xs text-slate-400 dark:text-slate-500">per month</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-slate-400 dark:text-slate-600">
                    <DollarSign size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No recurring expenses detected yet.</p>
                    <p className="text-sm">Mark transactions as "Recurring" in your dashboard or scan statements.</p>
                </div>
            )}
         </div>
      </section>

      {/* Item Breakdown Section */}
      <section>
        <div className="mb-4">
           <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
               <ShoppingBag className="mr-2 text-indigo-600 dark:text-indigo-400" size={24} />
               Item Spending Breakdown
           </h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Detailed look at individual items purchased within each category.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {Object.keys(itemBreakdown).length > 0 ? (
             Object.entries(itemBreakdown).map(([category, items]) => (
              <div key={category} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-800">
                   <h3 className="font-bold text-slate-800 dark:text-slate-200">{category}</h3>
                 </div>
                 <div className="flex-1 overflow-auto max-h-[300px]">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium sticky top-0">
                        <tr>
                          <th className="p-3 w-1/2">Item</th>
                          <th className="p-3 text-right">Qty</th>
                          <th className="p-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {Object.entries(items)
                          .sort(([, a], [, b]) => b.total - a.total)
                          .map(([name, data], idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 text-slate-700 dark:text-slate-300 font-medium break-words" title={name}>
                              {name.length > 25 ? name.substring(0, 25) + '...' : name}
                            </td>
                            <td className="p-3 text-right text-slate-500 dark:text-slate-400">{data.quantity}</td>
                            <td className="p-3 text-right text-slate-900 dark:text-slate-200 font-semibold">${data.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
           ))) : (
             <div className="col-span-full p-8 text-center text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
               <ShoppingBag size={48} className="mx-auto mb-3 opacity-20" />
               <p>No itemized data available.</p>
               <p className="text-sm">Scan receipts with detailed line items to see a breakdown here.</p>
             </div>
           )}
        </div>
      </section>
    </div>
  );
};

export default BudgetPage;