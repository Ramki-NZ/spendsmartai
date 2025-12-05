import React, { useState } from 'react';
import { Upload, Camera, FileText, Check, Loader2, AlertCircle, Save, Trash2, Edit2, Plus, Search, ExternalLink } from 'lucide-react';
import { parseReceiptOrStatement } from '../services/geminiService';
import { useData } from '../App';
import { Transaction, TransactionType } from '../types';

// Simple UUID fallback
const generateId = () => Math.random().toString(36).substring(2, 9);

const SUGGESTED_CATEGORIES = [
  "Groceries", "Dining", "Transport", "Utilities", "Shopping", 
  "Entertainment", "Health", "Housing", "Education", 
  "Personal Care", "Travel", "Subscriptions", "Other"
];

// Helper to infer category based on keywords in store name or items
const inferCategory = (store: string, items: any[]): string => {
  const textToCheck = `${store} ${items?.map((i: any) => i.name).join(' ')}`.toLowerCase();

  const keywords: Record<string, string[]> = {
    "Groceries": ["grocery", "market", "food", "supermarket", "mart", "produce", "fruit", "vegetable", "meat", "milk", "egg", "bread", "bakery", "kroger", "walmart", "whole foods", "trader joe", "safeway", "publix", "aldi", "lidl", "wegmans", "tesco", "sainsbury"],
    "Dining": ["restaurant", "cafe", "coffee", "starbucks", "diner", "bistro", "grill", "bar", "pizza", "burger", "mcdonald", "kfc", "taco", "chipotle", "subway", "eatery", "kitchen", "steakhouse", "baker", "dunkin", "domino", "wendy"],
    "Transport": ["fuel", "gas", "petrol", "shell", "bp", "chevron", "exxon", "uber", "lyft", "taxi", "train", "bus", "metro", "transit", "airline", "flight", "parking", "automotive", "car wash", "ticket", "transport"],
    "Utilities": ["electric", "water", "power", "energy", "gas", "internet", "wifi", "broadband", "cable", "phone", "mobile", "at&t", "verizon", "t-mobile", "comcast", "xfinity", "bill", "sewer", "trash", "waste"],
    "Shopping": ["amazon", "target", "costco", "best buy", "apple", "clothing", "apparel", "shoe", "fashion", "mall", "retail", "shop", "store", "electronics", "home depot", "lowe", "ikea", "book", "gift"],
    "Entertainment": ["movie", "cinema", "theater", "theatre", "netflix", "spotify", "hulu", "disney", "game", "nintendo", "steam", "playstation", "xbox", "concert", "ticket", "event", "museum", "bowling", "amusement"],
    "Health": ["pharmacy", "drug", "cvs", "walgreens", "rite aid", "doctor", "physician", "hospital", "clinic", "dental", "dentist", "medical", "health", "vitamin", "supplement", "gym", "fitness", "workout", "yoga"],
    "Housing": ["rent", "mortgage", "apartment", "housing", "maintenance", "repair", "plumber", "contractor", "furniture", "decor", "lease"],
    "Education": ["school", "university", "college", "tuition", "book", "course", "class", "training", "udemy", "coursera", "student"],
    "Personal Care": ["hair", "salon", "barber", "spa", "nail", "beauty", "cosmetic", "lotion", "shampoo", "soap", "grooming"],
    "Travel": ["hotel", "motel", "airbnb", "resort", "booking", "expedia", "trip", "vacation", "luggage", "tour"],
    "Subscriptions": ["subscription", "sub", "monthly", "yearly", "renewal", "membership", "prime", "premium"]
  };

  for (const [category, terms] of Object.entries(keywords)) {
    if (terms.some(term => textToCheck.includes(term))) {
      return category;
    }
  }

  return "Other";
};

const ScanPage: React.FC = () => {
  const { addTransaction } = useData();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedTransactions, setScannedTransactions] = useState<Transaction[]>([]);
  const [showReview, setShowReview] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);

    try {
      const rawData = await parseReceiptOrStatement(file);
      
      const processed: Transaction[] = rawData.map((item: any) => {
        let category = item.category;
        
        // Refine category if missing, "Uncategorized", or not in our suggested list
        if (!category || category === "Uncategorized" || !SUGGESTED_CATEGORIES.includes(category)) {
           category = inferCategory(item.store || "", item.items || []);
        }

        return {
          id: generateId(),
          date: item.date || new Date().toISOString().split('T')[0],
          store: item.store || 'Unknown Store',
          totalAmount: typeof item.totalAmount === 'number' ? item.totalAmount : 0,
          category: category,
          items: item.items || [],
          type: TransactionType.EXPENSE, // Default to expense
          isRecurring: !!item.isRecurring,
          source: 'RECEIPT'
        };
      });

      setScannedTransactions(processed);
      setShowReview(true);
    } catch (err) {
      setError("Failed to analyze image. Please try again with a clearer image.");
      console.error(err);
    } finally {
      setIsScanning(false);
      // Reset input
      e.target.value = '';
    }
  };

  const updateScannedTransaction = (id: string, field: keyof Transaction, value: any) => {
    setScannedTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const saveTransaction = (id: string) => {
    const t = scannedTransactions.find(tx => tx.id === id);
    if (t) {
      addTransaction(t);
      setScannedTransactions(prev => prev.filter(tx => tx.id !== id));
    }
  };

  const saveAll = () => {
    scannedTransactions.forEach(t => addTransaction(t));
    setScannedTransactions([]);
    setShowReview(false);
  };

  const discardTransaction = (id: string) => {
    setScannedTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  if (showReview && scannedTransactions.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Review Scanned Items</h2>
          <div className="space-x-3">
             <button 
               onClick={() => { setScannedTransactions([]); setShowReview(false); }}
               className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
             >
               Discard All
             </button>
             <button 
               onClick={saveAll}
               className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
             >
               Save All ({scannedTransactions.length})
             </button>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {scannedTransactions.map((t) => (
            <div key={t.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Store / Merchant</label>
                    <input 
                      type="text" 
                      value={t.store}
                      onChange={(e) => updateScannedTransaction(t.id, 'store', e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date</label>
                    <input 
                      type="date" 
                      value={t.date}
                      onChange={(e) => updateScannedTransaction(t.id, 'date', e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Total Amount ($)</label>
                    <input 
                      type="number" 
                      value={t.totalAmount}
                      onChange={(e) => updateScannedTransaction(t.id, 'totalAmount', parseFloat(e.target.value))}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
                    <select 
                      value={t.category}
                      onChange={(e) => updateScannedTransaction(t.id, 'category', e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm"
                    >
                      {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
               </div>

               {t.items.length > 0 && (
                 <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Detected Items:</p>
                    <ul className="space-y-2">
                      {t.items.map((item, i) => (
                        <li key={i} className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center">
                            <span>{item.quantity}x {item.name}</span>
                            <a 
                              href={`https://www.google.com/search?q=${encodeURIComponent(item.name)}&tbm=shop`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800 group"
                              title="Search for better price"
                            >
                              <Search size={10} className="mr-1 group-hover:scale-110 transition-transform" /> 
                              Price Check
                            </a>
                          </div>
                          <span>${item.totalPrice.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                 </div>
               )}

               <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={t.isRecurring}
                      onChange={(e) => updateScannedTransaction(t.id, 'isRecurring', e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Recurring Bill?</span>
                  </label>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => discardTransaction(t.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Discard"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => saveTransaction(t.id)}
                      className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                      title="Save"
                    >
                      <Check size={18} />
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-10">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Scan & Analyze</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Upload receipts or bank statements. Our AI will extract items, prices, and categorize them for you.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group relative overflow-hidden">
        <input 
          type="file" 
          accept="image/*,.pdf"
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isScanning}
        />
        
        {isScanning ? (
          <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
            <Loader2 size={48} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
            <p className="font-medium text-slate-600 dark:text-slate-300">Analyzing document...</p>
            <p className="text-sm text-slate-400">Identifying items, prices, and categories</p>
          </div>
        ) : (
          <div className="space-y-4 group-hover:scale-105 transition-transform duration-300">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
              <Upload size={32} />
            </div>
            <div>
               <h3 className="text-xl font-bold text-slate-800 dark:text-white">Click to Upload</h3>
               <p className="text-slate-500 dark:text-slate-400 mt-1">or drag and drop receipt images here</p>
            </div>
            <div className="inline-flex items-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">
               <FileText size={12} className="mr-1" /> Supports JPG, PNG, PDF
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-center space-x-3 text-red-600 dark:text-red-400">
           <AlertCircle size={20} />
           <span>{error}</span>
        </div>
      )}

      {/* Manual Entry Option */}
      <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800">
         <p className="text-slate-400 dark:text-slate-500 mb-4">Prefer manual entry?</p>
         <button 
           onClick={() => {
              const newTx: Transaction = {
                  id: generateId(),
                  date: new Date().toISOString().split('T')[0],
                  store: '',
                  totalAmount: 0,
                  category: 'Other',
                  items: [],
                  type: TransactionType.EXPENSE,
                  isRecurring: false,
                  source: 'MANUAL'
              };
              setScannedTransactions([newTx]);
              setShowReview(true);
           }}
           className="inline-flex items-center px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
         >
           <Plus size={18} className="mr-2" /> Add Manually
         </button>
      </div>
    </div>
  );
};

export default ScanPage;