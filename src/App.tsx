import React, { useState, useEffect } from 'react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, db, OperationType, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, DEFAULT_CATEGORIES } from './types';
import { MessageSquare, PieChart, Settings, LogIn, Wallet, ShieldCheck, Zap, UserPlus, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import ChatView from './components/ChatView';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import AdminDashboard from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'settings' | 'admin'>('chat');
  
  // Login Form State
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          const isAdminEmail = firebaseUser.email === 'admin@finchat.com';
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Force admin role if it's the admin email but role is wrong
            if (isAdminEmail && data.role !== 'admin') {
              await setDoc(userDocRef, { ...data, role: 'admin' }, { merge: true });
              setProfile({ ...data, role: 'admin', createdAt: data.createdAt?.toDate() || new Date() } as UserProfile);
            } else {
              setProfile({
                ...data,
                createdAt: data.createdAt?.toDate() || new Date()
              } as UserProfile);
            }
          } else {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: isAdminEmail ? 'Administrador' : (displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário'),
              email: firebaseUser.email,
              photoURL: null,
              currency: 'BRL',
              categories: DEFAULT_CATEGORIES,
              role: isAdminEmail ? 'admin' : 'user',
              createdAt: new Date()
            };
            await setDoc(userDocRef, {
              ...newProfile,
              createdAt: serverTimestamp()
            });
            setProfile(newProfile);
          }
          
          if (isAdminEmail) {
            setActiveTab('admin');
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
  }, [displayName]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        console.log("Attempting to register:", email);
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        console.log("Attempting to login:", email);
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth failed:", error);
      let message = "Ocorreu um erro na autenticação.";
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "E-mail ou senha incorretos.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "Este e-mail já está em uso.";
      } else if (error.code === 'auth/weak-password') {
        message = "A senha deve ter pelo menos 6 caracteres.";
      } else if (error.code === 'auth/invalid-email') {
        message = "E-mail inválido.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "O login por e-mail/senha não está ativado no console do Firebase. Por favor, ative-o em Authentication > Sign-in method.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Muitas tentativas malsucedidas. Tente novamente mais tarde.";
      }
      
      setAuthError(message);
      setLoading(false);
    }
  };

  if (loading && !user) {
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
          {user && (
            <button
              onClick={() => auth.signOut()}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium flex items-center gap-1"
            >
              Sair
            </button>
          )}
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
            {/* Left Side: Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6 hidden lg:block"
            >
              <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-tight">
                Controle seus gastos <br />
                <span className="text-emerald-600">enviando um zap.</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                A maneira inteligente de gerenciar seu dinheiro. Converse com nossa IA para registrar despesas e ver relatórios instantaneamente.
              </p>
              <div className="space-y-4">
                {[
                  { icon: <MessageSquare className="text-emerald-500" size={20} />, title: "Chat", desc: "Registro simples" },
                  { icon: <Zap className="text-amber-500" size={20} />, title: "IA", desc: "Categorização automática" },
                  { icon: <ShieldCheck className="text-blue-500" size={20} />, title: "Seguro", desc: "Dados privados" }
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1">{feature.icon}</div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{feature.title}</h3>
                      <p className="text-xs text-gray-500">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Side: Login Form */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 w-full max-w-md mx-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isRegistering ? 'Criar Conta' : 'Bem-vindo de volta'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {isRegistering ? 'Cadastre-se para começar a usar o FinChat' : 'Entre com suas credenciais para continuar'}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {isRegistering && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg border border-rose-100">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />}
                      {isRegistering ? 'Criar Conta' : 'Entrar'}
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setAuthError(null);
                  }}
                  className="text-emerald-600 text-sm font-semibold hover:underline"
                >
                  {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
                </button>
              </div>
            </motion.div>
          </div>
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
            {activeTab === 'admin' && profile?.role === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0"
              >
                <AdminDashboard />
              </motion.div>
            )}
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
            ...(profile?.role === 'admin' ? [{ id: 'admin', icon: <ShieldCheck size={24} />, label: 'Admin' }] : []),
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
