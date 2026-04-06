import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult, db, OperationType, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, DEFAULT_CATEGORIES } from './types';
import { MessageSquare, PieChart, Settings, LogIn, Wallet, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import ChatView from './components/ChatView';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'settings'>('chat');

  useEffect(() => {
    // Handle redirect result
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect login failed:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setProfile({
              ...userDoc.data(),
              createdAt: userDoc.data().createdAt?.toDate() || new Date()
            } as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              currency: 'BRL',
              categories: DEFAULT_CATEGORIES,
              createdAt: new Date()
            };
            await setDoc(userDocRef, {
              ...newProfile,
              createdAt: serverTimestamp()
            });
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        } finally {
          setUser(firebaseUser);
          setLoading(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      // Check if we are on mobile or if popup is likely to be blocked
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
          console.error("Popup login failed:", error);
          // Fallback to redirect if popup fails
          if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-600">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-white"
        >
          <Wallet size={64} />
        </motion.div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="p-4 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
            <Wallet size={24} />
            <span>FinChat</span>
          </div>
          <button
            onClick={handleLogin}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-full font-semibold transition-all flex items-center gap-2 shadow-md"
          >
            <LogIn size={18} />
            Entrar
          </button>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center p-4 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              Controle seus gastos <br />
              <span className="text-emerald-600">enviando um zap.</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
              A maneira inteligente de gerenciar seu dinheiro. Converse com nossa IA para registrar despesas e ver relatórios instantaneamente.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {[
                { icon: <MessageSquare className="text-emerald-500" size={20} />, title: "Chat", desc: "Registro simples" },
                { icon: <Zap className="text-amber-500" size={20} />, title: "IA", desc: "Categorização automática" },
                { icon: <ShieldCheck className="text-blue-500" size={20} />, title: "Seguro", desc: "Dados privados" }
              ].map((feature, i) => (
                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-left">
                  <div className="mb-2">{feature.icon}</div>
                  <h3 className="font-bold text-gray-900 text-sm mb-0.5">{feature.title}</h3>
                  <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleLogin}
              className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full text-base font-bold transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
            >
              Começar Agora
              <LogIn size={20} />
            </button>
          </motion.div>
        </main>

        <footer className="p-4 text-center text-gray-400 text-xs">
          &copy; 2026 FinChat. Todos os direitos reservados.
        </footer>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <header className="bg-emerald-600 text-white p-4 flex items-center justify-between shadow-md relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="font-bold leading-tight">FinChat</h1>
              <p className="text-[10px] opacity-80 uppercase tracking-widest">Assistente Pessoal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium">{profile.displayName}</p>
              <p className="text-[10px] opacity-70">{profile.email}</p>
            </div>
            {profile.photoURL && (
              <img src={profile.photoURL} alt="Perfil" className="w-8 h-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 relative overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0"
              >
                <ChatView user={profile} />
              </motion.div>
            )}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0"
              >
                <DashboardView user={profile} />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0"
              >
                <SettingsView user={profile} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-gray-200 flex justify-around p-2 pb-safe relative z-20">
          {[
            { id: 'chat', icon: <MessageSquare size={24} />, label: 'Conversa' },
            { id: 'dashboard', icon: <PieChart size={24} />, label: 'Relatórios' },
            { id: 'settings', icon: <Settings size={24} />, label: 'Ajustes' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex flex-col items-center gap-1 px-6 py-1 rounded-xl transition-all",
                activeTab === tab.id ? "text-emerald-600 bg-emerald-50" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {tab.icon}
              <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </ErrorBoundary>
  );
}
