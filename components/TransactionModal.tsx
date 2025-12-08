import React, { useState } from 'react';
import { Transaction, Item } from '../types';
import { X, Save, Trash2, Edit2, Calendar, Store, Tag, DollarSign, Plus, RefreshCw } from 'lucide-react';

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
  onDelete: (id: string) => void;
}

const SUGGESTED_CATEGORIES = [
  "Groceries", "Dining", "Transport", "Utilities", "Shopping", 
  "Entertainment", "Health", "Housing", "Education", 
  "Personal Care", "Travel", "Subscriptions", "Other"
];

const TransactionModal: React.FC<Props> = ({ transaction, onClose, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Transaction>({ ...transaction });

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      onDelete(transaction.id);
      onClose();
    }
  };

  const updateField = (field: keyof Transaction, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof Item, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    // Auto calc total
    if (field === 'quantity' || field === 'unitPrice') {
         newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    const newItem: Item = {
        name: "New Item",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        category: formData.category || "Other"
    };
    setFormData(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const removeItem = (index: number) => {
      const newItems = (formData.items || []).filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
  };

  const recalculateTotal = () => {
      const sum = (formData.items || []).reduce((acc, item) => acc + item.totalPrice, 0);
      updateField('totalAmount', sum);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Transaction' : 'Transaction Details'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Store / Merchant</label>
                <div className="relative">
                  <Store className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={formData.store}
                    onChange={(e) => updateField('store', e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => updateField('date', e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex justify-between">
                        <span>Amount ($)</span>
                        <button type="button" onClick={recalculateTotal} className="text-indigo-600 hover:text-indigo-700 text-[10px] flex items-center">
                            <RefreshCw size={10} className="mr-1"/> Recalc
                        </button>
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-3 text-slate-400" size={16} />
                        <input
                            type="number"
                            value={formData.totalAmount}
                            onChange={(e) => updateField('totalAmount', parseFloat(e.target.value))}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
                <div className="relative">
                    <Tag className="absolute left-3 top-3 text-slate-400" size={16} />
                    <select
                        value={formData.category}
                        onChange={(e) => updateField('category', e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                    >
                        {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
              </div>

               <div className="flex items-center space-x-2 pt-2 pb-2">
                 <input 
                   type="checkbox" 
                   id="isRecurring"
                   checked={formData.isRecurring}
                   onChange={(e) => updateField('isRecurring', e.target.checked)}
                   className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                 />
                 <label htmlFor="isRecurring" className="text-sm text-slate-700 dark:text-slate-300">Mark as Recurring / Subscription</label>
               </div>

               {/* Editable Items Section */}
               <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex justify-between items-center mb-2">
                         <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Edit Items</h4>
                         <button type="button" onClick={addItem} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center">
                             <Plus size={12} className="mr-1"/> Add Item
                         </button>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {formData.items?.map((item, i) => (
                            <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                                <div className="flex justify-between gap-2">
                                     <input 
                                        type="text" 
                                        value={item.name}
                                        onChange={(e) => updateItem(i, 'name', e.target.value)}
                                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs"
                                        placeholder="Item Name"
                                     />
                                     <button type="button" onClick={() => removeItem(i)} className="text-slate-400 hover:text-red-500">
                                         <X size={14} />
                                     </button>
                                </div>
                                <div className="flex gap-2">
                                     <div className="w-16">
                                        <input 
                                            type="number" 
                                            value={item.quantity}
                                            onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-right"
                                            placeholder="Qty"
                                        />
                                     </div>
                                     <div className="w-20">
                                        <input 
                                            type="number" 
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-right"
                                            placeholder="Price"
                                        />
                                     </div>
                                     <div className="flex-1">
                                         <select
                                            value={item.category || formData.category || "Other"}
                                            onChange={(e) => updateItem(i, 'category', e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs"
                                         >
                                             {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                         </select>
                                     </div>
                                </div>
                            </div>
                        ))}
                    </div>
               </div>
            </div>
          ) : (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formData.store}</h3>
                        <p className="text-slate-500 dark:text-slate-400 flex items-center mt-1">
                            <Calendar size={14} className="mr-1.5" /> {formData.date}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">${formData.totalAmount.toFixed(2)}</p>
                        <span className="inline-flex items-center px-2.5 py-1 mt-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Tag size={12} className="mr-1" /> {formData.category}
                        </span>
                    </div>
                </div>

                {formData.isRecurring && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-4 py-3 rounded-xl text-sm flex items-center">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                        Marked as a recurring expense
                    </div>
                )}

                <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-sm uppercase tracking-wide">Items ({formData.items?.length || 0})</h4>
                    {formData.items && formData.items.length > 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                             <table className="w-full text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Item</th>
                                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                                        <th className="px-4 py-2 text-right font-medium">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {formData.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-[10px] text-slate-400">{item.category}</div>
                                            </td>
                                            <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right text-slate-900 dark:text-slate-200">${item.totalPrice.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm italic">No line items available.</p>
                    )}
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-950 rounded-b-2xl">
           {isEditing ? (
             <>
               <button 
                 onClick={() => { setIsEditing(false); setFormData({...transaction}); }}
                 className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleSave}
                 className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
               >
                 <Save size={18} className="mr-2" /> Save Changes
               </button>
             </>
           ) : (
             <>
                <button 
                 onClick={handleDelete}
                 className="flex items-center px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
               >
                 <Trash2 size={18} className="mr-2" /> Delete
               </button>
               <button 
                 onClick={() => setIsEditing(true)}
                 className="flex items-center px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
               >
                 <Edit2 size={18} className="mr-2" /> Edit Details
               </button>
             </>
           )}
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;