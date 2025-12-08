import React, { useState } from 'react';
import { useData } from './contexts'; 
import { getShoppingAdvice } from '../services/geminiService';
import { Send, Bot, ShoppingCart, Lightbulb, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AdvisorPage: React.FC = () => {
  const { transactions } = useData();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string, grounding?: any[]}[]>([
    { role: 'ai', content: "Hello! I'm SpendSmartAI. I can analyze your spending habits, suggest savings strategies, or find better prices for items you buy regularly. Try asking: 'Where can I buy milk cheaper?' or 'Analyze my grocery spending'." }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const result = await getShoppingAdvice(transactions, userMsg);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: result.text || "I couldn't generate a response. Please try again.",
        grounding: result.grounding 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error connecting to the AI service." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center space-x-2">
         <Bot className="text-indigo-600 dark:text-indigo-400" />
         <h2 className="font-bold text-slate-800 dark:text-white">Smart Advisor</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
               <div className="prose prose-sm max-w-none dark:prose-invert">
                 <ReactMarkdown>{msg.content}</ReactMarkdown>
               </div>
               
               {/* Display Grounding Sources (Links) */}
               {msg.grounding && msg.grounding.length > 0 && (
                 <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-xs font-semibold opacity-70 mb-1">Sources found:</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.grounding.map((chunk: any, i: number) => {
                         const web = chunk.web || chunk.retrievedContext?.web;
                         if (!web?.uri) return null;
                         return (
                            <a 
                              key={i} 
                              href={web.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                            >
                              <ExternalLink size={10} className="mr-1" />
                              {web.title || new URL(web.uri).hostname}
                            </a>
                         );
                      })}
                    </div>
                 </div>
               )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:200ms]"></div>
                <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:400ms]"></div>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <form onSubmit={handleSend} className="relative">
           <label htmlFor="advisor-input" className="sr-only">Ask a question</label>
           <input
             id="advisor-input"
             type="text"
             className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
             placeholder="Ask about prices, budgets, or spending habits..."
             value={query}
             onChange={e => setQuery(e.target.value)}
           />
           <button 
             type="submit" 
             disabled={loading || !query.trim()}
             title="Send message"
             className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Send size={20} />
           </button>
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
           <button onClick={() => setQuery("Where can I buy milk cheaper nearby?")} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-full border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center">
              <ShoppingCart size={12} className="mr-1"/> Compare Prices
           </button>
           <button onClick={() => setQuery("Analyze my spending on groceries last month.")} className="whitespace-nowrap px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-full border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center">
              <Lightbulb size={12} className="mr-1"/> Spending Habits
           </button>
        </div>
      </div>
    </div>
  );
};

export default AdvisorPage;