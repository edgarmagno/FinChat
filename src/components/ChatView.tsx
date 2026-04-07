import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, Timestamp, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { ChatMessage, UserProfile, DEFAULT_CATEGORIES } from '../types';
import { parseFinancialMessage } from '../services/nlpService';
import { Send, User as UserIcon, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface ChatViewProps {
  user: UserProfile;
}

export default function ChatView({ user }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const path = `users/${auth.currentUser.uid}/messages`;
    const q = query(
      collection(db, path),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as Timestamp).toDate()
      })) as ChatMessage[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing || !auth.currentUser) return;

    const text = inputText.trim();
    setInputText('');
    setIsProcessing(true);

    try {
      const userMessage: ChatMessage = {
        userId: auth.currentUser.uid,
        text,
        sender: 'user',
        timestamp: new Date()
      };

      const messagesPath = `users/${auth.currentUser.uid}/messages`;
      const transactionsPath = `users/${auth.currentUser.uid}/transactions`;

      // 1. Add user message to Firestore
      await addDoc(collection(db, messagesPath), {
        ...userMessage,
        timestamp: serverTimestamp()
      });

      // 2. Parse with AI
      const parsed = await parseFinancialMessage(text, user.categories || DEFAULT_CATEGORIES);

      let aiResponseText = "";
      let transactionId = "";

      if (parsed) {
        // 3. Create transaction if parsed successfully
        const transactionDoc = await addDoc(collection(db, transactionsPath), {
          userId: auth.currentUser.uid,
          type: parsed.type,
          amount: parsed.amount,
          category: parsed.category,
          description: parsed.description,
          date: Timestamp.fromDate(new Date(parsed.date)),
          rawMessage: text,
          createdAt: serverTimestamp()
        });
        transactionId = transactionDoc.id;
        aiResponseText = `✅ Registrado ${parsed.type === 'expense' ? 'gasto' : 'ganho'}: ${user.currency} ${parsed.amount.toFixed(2)} em ${parsed.category}.`;
      } else {
        aiResponseText = "Não consegui entender como uma transação financeira. Tente algo como 'Gastei 50 com jantar' ou 'Recebi 2000 de salário'.";
      }

      // 4. Add AI response
      await addDoc(collection(db, messagesPath), {
        userId: auth.currentUser.uid,
        text: aiResponseText,
        sender: 'ai',
        timestamp: serverTimestamp(),
        transactionId: transactionId || null
      });

    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#efeae2] dark:bg-gray-950 relative overflow-hidden transition-colors">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.02] pointer-events-none" 
           style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "max-w-[85%] rounded-lg p-3 shadow-sm text-sm relative",
                msg.sender === 'user' 
                  ? "ml-auto bg-[#dcf8c6] dark:bg-emerald-900/40 text-gray-800 dark:text-emerald-50 rounded-tr-none" 
                  : "mr-auto bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none"
              )}
            >
              <div className="flex items-start gap-2">
                {msg.sender === 'ai' && <Bot size={16} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />}
                <div className="flex flex-col">
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 self-end mt-1">
                    {format(msg.timestamp, 'HH:mm')}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isProcessing && (
          <div className="mr-auto bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg rounded-tl-none p-3 shadow-sm text-sm flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-emerald-600 dark:text-emerald-400" />
            <span>Processando...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] dark:bg-gray-900 p-3 relative z-10 border-t border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite uma mensagem (ex: 'Gastei 50 com comida')"
            className="flex-1 bg-white dark:bg-gray-800 dark:text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm border border-transparent dark:border-gray-700"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white p-2 rounded-full transition-colors shadow-sm"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
