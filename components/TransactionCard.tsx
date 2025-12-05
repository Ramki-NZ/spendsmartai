import React from 'react';
import { Transaction, TransactionType } from '../types';
import { Calendar, Store, Tag, Repeat } from 'lucide-react';
import { useData } from '../App';

interface Props {
  transaction: Transaction;
}

const TransactionCard: React.FC<Props> = ({ transaction }) => {
  const { updateTransaction } = useData();

  const toggleRecurring = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateTransaction({
      ...transaction,
      isRecurring: !transaction.isRecurring
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
           <div className={`p-2 rounded-full ${transaction.type === TransactionType.EXPENSE ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
              <Store size={18} />
           </div>
           <div>
             <h3 className="font-semibold text-slate-800 dark:text-slate-200">{transaction.store}</h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
               <Calendar size={12} className="mr-1" />
               {transaction.date}
             </p>
           </div>
        </div>
        <div className="text-right">
          <p className={`font-bold ${transaction.type === TransactionType.EXPENSE ? 'text-slate-900 dark:text-slate-100' : 'text-green-600 dark:text-green-400'}`}>
             {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
             ${transaction.totalAmount.toFixed(2)}
          </p>
          <button 
            onClick={toggleRecurring}
            className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full mt-1 transition-colors cursor-pointer border ${transaction.isRecurring ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'}`}
            title={transaction.isRecurring ? "Mark as one-time" : "Mark as recurring"}
          >
             <Repeat size={10} className="mr-1" /> {transaction.isRecurring ? 'Recurring' : 'One-time'}
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="inline-flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-md">
          <Tag size={12} className="mr-1" /> {transaction.category}
        </span>
        {transaction.items && transaction.items.length > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500 self-center">
            {transaction.items.length} items parsed
          </span>
        )}
      </div>

      {transaction.items && transaction.items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
           <details className="group">
             <summary className="text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer font-medium hover:text-indigo-800 dark:hover:text-indigo-300">
               View Items
             </summary>
             <ul className="mt-2 space-y-1">
               {transaction.items.map((item, idx) => (
                 <li key={idx} className="text-xs flex justify-between text-slate-600 dark:text-slate-400">
                   <span>{item.quantity}x {item.name}</span>
                   <span>${item.totalPrice?.toFixed(2)}</span>
                 </li>
               ))}
             </ul>
           </details>
        </div>
      )}
    </div>
  );
};

export default TransactionCard;