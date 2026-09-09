import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, AlertCircle, RefreshCcw } from 'lucide-react';
import { coachService } from '../services/coachService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  action?: string | null;
  timestamp: Date;
}

export default function CoachView() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'coach',
      text: "Salut ! Je suis ton Coach Plana. Je base mes conseils uniquement sur tes données de santé réelles et ta progression (CTL/ATL). Pose-moi une question sur ton état de forme, ton plan d'entraînement, ou tes dernières séances.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setError(null);

    const newUserMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    const response = await coachService.askCoach(userText);
    
    setIsLoading(false);

    if (response.success) {
      setMessages(prev => [...prev, {
        id: `c-${Date.now()}`,
        sender: 'coach',
        text: response.message,
        action: response.suggestedAction,
        timestamp: new Date()
      }]);
    } else {
      setError(response.message || "Erreur de connexion au coach.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="p-4 bg-white dark:bg-slate-800 shadow-sm z-10 flex items-center justify-between sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
            <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Coach IA</h1>
            <p className="text-xs text-slate-500">Explications & Analyse</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.sender === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
              
              {msg.action && msg.sender === 'coach' && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-medium text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Action suggérée :</span>
                  <div className="mt-1 inline-block px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                    {msg.action}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex space-x-2 items-center h-5">
                <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center my-4">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg flex items-center space-x-2 text-sm max-w-[85%]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 sticky bottom-0">
        <form onSubmit={handleSend} className="flex space-x-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demande une explication sur tes données..."
            className="flex-1 bg-slate-100 dark:bg-slate-900 border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
