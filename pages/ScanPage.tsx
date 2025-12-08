import React, { useState } from 'react';
import { Upload, Loader2, AlertCircle, Check, Trash2, Search, Plus, MapPin, X, Edit2, ShoppingBag } from 'lucide-react';
import { parseReceiptOrStatement } from '../services/geminiService';
import { useData } from '../App';
import { Transaction, TransactionType, Item } from '../types';

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
    "Dining": ["restaurant", "cafe", "coffee", "starbucks", "diner", "bistro", "grill", "bar", "pizza", "burger", "mcdonald", "kfc", "taco", "chipotle", "subway", "eatery", "kitchen", "steakhouse", "baker", "dunkin", "domino", "wendy", "doordash", "ubereats"],
    "Transport": ["fuel", "gas", "petrol", "shell", "bp", "chevron", "exxon", "uber", "lyft", "taxi", "train", "bus", "metro", "transit", "airline", "flight", "parking", "automotive", "car wash", "ticket", "transport", "station"],
    "Utilities": ["electric", "water", "power", "energy", "gas", "internet", "wifi", "broadband", "cable", "phone", "mobile", "at&t", "verizon", "t-mobile", "comcast", "xfinity", "bill", "sewer", "trash", "waste"],
    "Shopping": ["amazon", "target", "costco", "best buy", "apple", "clothing", "apparel", "shoe", "fashion", "mall", "retail", "shop", "store", "electronics", "home depot", "lowe", "ikea", "book", "gift", "cloth", "wear"],
    "Entertainment": ["movie", "cinema", "theater", "theatre", "netflix", "spotify", "hulu", "disney", "game", "nintendo", "steam", "playstation", "xbox", "concert", "ticket", "event", "museum", "bowling", "amusement"],
    "Health": ["pharmacy", "drug", "cvs", "walgreens", "rite aid", "doctor", "physician", "hospital", "clinic", "dental", "dentist", "medical", "health", "vitamin", "supplement", "gym", "fitness", "workout", "yoga"],
    "Housing": ["rent", "mortgage", "apartment", "housing", "maintenance", "repair", "plumber", "contractor", "furniture", "decor", "lease", "home"],
    "Education": ["school", "university", "college", "tuition", "book", "course", "class", "training", "udemy", "coursera", "student"],
    "Personal Care": ["hair", "salon", "barber", "spa", "nail", "beauty", "cosmetic", "lotion", "shampoo", "soap", "grooming", "cut"],
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
  
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

        // Process Items to ensure categories are valid
        const processedItems = (item.items || []).map((i: any) => ({
            ...i,
            // Fallback to transaction category or 'Other' if specific item category is not standard
            category: SUGGESTED_CATEGORIES.includes(i.category) ? i.category : (category || "Other")
        }));

        return {
          id: generateId(),
          date: item.date || new Date().toISOString().split('T')[0],
          store: item.store || 'Unknown Store',
          totalAmount: typeof item.totalAmount === 'number' ? item.totalAmount : 0,
          category: category,
          items: processedItems,
          type: TransactionType.EXPENSE, // Default to expense
          isRecurring: !!item.isRecurring,
          source: 'RECEIPT'
        };
      });

      setScannedTransactions(processed);
      setShowReview(true);
      // Select all by default
      setSelectedIds(new Set(processed.map(t => t.id)));
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

  // --- Item Management ---

  const updateItem = (transactionId: string, itemIndex: number, field: keyof Item, value: any) => {
    setScannedTransactions(prev => prev.map(t => {
        if (t.id !== transactionId) return t;
        const newItems = [...t.items];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
        // Recalculate total price if qty or unit price changes
        if (field === 'quantity' || field === 'unitPrice') {
             newItems[itemIndex].totalPrice = newItems[itemIndex].quantity * newItems[itemIndex].unitPrice;
        }
        return { ...t, items: newItems };
    }));
  };

  const addItem = (transactionId: string) => {
    setScannedTransactions(prev => prev.map(t => {
        if (t.id !== transactionId) return t;
        const newItem: Item = {
            name: "New Item",
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            category: t.category // Default to transaction category
        };
        return { ...t, items: [...t.items, newItem] };
    }));
  };

  const removeItem = (transactionId: string, itemIndex: number) => {
      setScannedTransactions(prev => prev.map(t => {
          if (t.id !== transactionId) return t;
          const newItems = t.items.filter((_, i) => i !== itemIndex);
          return { ...t, items: newItems };
      }));
  };

  // --- Bulk Actions ---

  const toggleSelectAll = () => {
    if (selectedIds.size === scannedTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(scannedTransactions.map(t => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const saveSelected = () => {
    const toSave = scannedTransactions.filter(t => selectedIds.has(t.id));
    toSave.forEach(t => addTransaction(t));
    
    // Remove saved from list
    const remaining = scannedTransactions.filter(t => !selectedIds.has(t.id));
    setScannedTransactions(remaining);
    setSelectedIds(new Set());
    if (remaining.length === 0) setShowReview(false);
  };

  const discardSelected = () => {
    const remaining = scannedTransactions.filter(t => !selectedIds.has(t.id));
    setScannedTransactions(remaining);
    setSelectedIds(new Set());
    if (remaining.length === 0) setShowReview(false);
  };

  const bulkUpdateCategory = (category: string) => {
      setScannedTransactions(prev => prev.map(t => 
        selectedIds.has(t.id) ? { ...t, category } : t
      ));
  };

  // --- Price Check Logic ---

  const handleCheckPrice = (itemName: string) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Permission granted, include "near me" for local context
          const query = encodeURIComponent(`${itemName} price near me`);
          window.open(`https://www.google.com/search?q=${query}&tbm=shop`, '_blank');
        },
        (error) => {
          // Permission denied or error, fallback to general online search
          console.warn("Geolocation not available or denied:", error);
          const query = encodeURIComponent(`${itemName} price`);
          window.open(`https://www.google.com/search?q=${query}&tbm=shop`, '_blank');
        }
      );
    } else {
      // Geolocation not supported
      const query = encodeURIComponent(`${itemName} price`);
      window.open(`https://www.google.com/search?q=${query}&tbm=shop`, '_blank');
    }
  };

  if (showReview && scannedTransactions.length > 0) {
    return (
      <div className="space-y-6 pb-20">
        <div className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 pt-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4 w-full md:w-auto">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review Transactions</h2>
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-sm font-semibold">
                    {scannedTransactions.length}
                </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 mr-2 shadow-sm">
                        <span className="text-xs font-medium px-2 text-slate-500">{selectedIds.size} Selected</span>
                        <select 
                            onChange={(e) => bulkUpdateCategory(e.target.value)}
                            className="text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded border-none focus:ring-1 focus:ring-indigo-500"
                            defaultValue=""
                        >
                            <option value="" disabled>Set Category</option>
                            {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={discardSelected} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setScannedTransactions([]); setShowReview(false); }}
                        className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Discard All
                    </button>
                    <button 
                        onClick={saveSelected}
                        disabled={selectedIds.size === 0}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        <Check size={16} className="mr-2" /> Save Selected
                    </button>
                </div>
            </div>
            </div>
            
            <div className="flex items-center mt-4">
                <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={selectedIds.size === scannedTransactions.length && scannedTransactions.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Select All</span>
                </label>
            </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {scannedTransactions.map((t) => (
            <div 
                key={t.id} 
                className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border transition-all shadow-sm relative group
                ${selectedIds.has(t.id) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-800 hover:shadow-md'}`}
            >
               {/* Selection Checkbox (Absolute) */}
               <div className="absolute top-4 right-4">
                   <input 
                      type="checkbox" 
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                   />
               </div>

               <div className="grid grid-cols-1 gap-4 mb-4 pr-8">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Store Name</label>
                        <input 
                          type="text" 
                          value={t.store}
                          onChange={(e) => updateScannedTransaction(t.id, 'store', e.target.value)}
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Main Category</label>
                        <select 
                          value={t.category}
                          onChange={(e) => updateScannedTransaction(t.id, 'category', e.target.value)}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm"
                        >
                          {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                  </div>
               </div>

               {/* Editable Items List */}
               <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Items Breakdown</p>
                        <button 
                          onClick={() => addItem(t.id)}
                          className="text-[10px] flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                            <Plus size={12} className="mr-1" /> Add Item
                        </button>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {t.items.map((item, i) => (
                        <div key={i} className="flex flex-col gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700/50 shadow-sm group/item">
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateItem(t.id, i, 'name', e.target.value)}
                                    className="flex-1 min-w-0 p-1 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 outline-none"
                                    placeholder="Item name"
                                />
                                <button 
                                    onClick={() => removeItem(t.id, i)}
                                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <div className="flex items-center w-16">
                                    <span className="text-[10px] text-slate-400 mr-1">Qty</span>
                                    <input 
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(t.id, i, 'quantity', parseFloat(e.target.value))}
                                        className="w-full p-1 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 text-xs text-right text-slate-600 dark:text-slate-400 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="flex items-center w-20">
                                    <span className="text-[10px] text-slate-400 mr-1">Price</span>
                                    <input 
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) => updateItem(t.id, i, 'unitPrice', parseFloat(e.target.value))}
                                        className="w-full p-1 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 text-xs text-right text-slate-600 dark:text-slate-400 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="flex-1 min-w-[100px]">
                                    <select 
                                        value={item.category || t.category || "Other"}
                                        onChange={(e) => updateItem(t.id, i, 'category', e.target.value)}
                                        className="w-full p-1.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700 outline-none cursor-pointer hover:border-indigo-300 focus:border-indigo-500 transition-colors"
                                    >
                                        {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-1 border-t border-slate-50 dark:border-slate-800 mt-1">
                                <button
                                    onClick={() => handleCheckPrice(item.name)}
                                    className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                                    title="Search local & online prices"
                                >
                                    <MapPin size={10} /> Check Price
                                </button>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    ${(item.totalPrice || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                      ))}
                      {t.items.length === 0 && (
                          <p className="text-center text-xs text-slate-400 py-2">No items detected. Add one manually.</p>
                      )}
                    </div>
               </div>

               <div className="flex justify-between items-center pt-2">
                  <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={t.isRecurring}
                      onChange={(e) => updateScannedTransaction(t.id, 'isRecurring', e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Recurring Bill?</span>
                  </label>
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
               <div className="mr-2">JPG, PNG, PDF</div>
               <Search size={10} className="mr-1" /> AI Powered OCR
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
              setSelectedIds(new Set([newTx.id]));
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