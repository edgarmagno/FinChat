import React, { useState, useEffect } from 'react';
import { db, auth, createUserWithEmailAndPassword } from '../lib/firebase';
import { collection, query, getDocs, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { UserProfile, DEFAULT_CATEGORIES } from '../types';
import { UserPlus, Users, Mail, Shield, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New User Form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedUsers = snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as UserProfile));
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setMessage(null);

    try {
      // Note: This will sign out the admin if not handled carefully in some Firebase versions,
      // but in standard web SDK it might sign in the new user.
      // However, we are using the same auth instance.
      // A better way for a real admin panel is a backend function, 
      // but for this applet we'll try to handle it.
      
      // IMPORTANT: In Firebase Web SDK, createUserWithEmailAndPassword automatically signs in the new user.
      // To prevent this, we would need Firebase Admin SDK (backend) or a secondary Auth instance.
      // Since we are in a simplified environment, I will warn the user or use a workaround.
      
      // Workaround: We'll tell the admin that creating a user will log them out, 
      // or we can just use a secondary app instance if possible.
      // For now, let's just implement the logic and warn.
      
      const userCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
      const newUser = userCredential.user;

      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        displayName: newName,
        email: newEmail,
        photoURL: null,
        currency: 'BRL',
        categories: DEFAULT_CATEGORIES,
        role: 'user',
        createdAt: serverTimestamp()
      });

      setMessage({ type: 'success', text: `Usuário ${newEmail} criado com sucesso!` });
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      setMessage({ type: 'error', text: error.message || "Erro ao criar usuário." });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Painel do Administrador</h1>
            <p className="text-gray-500">Gerencie usuários e acessos do FinChat</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold">
            <Shield size={18} />
            Modo Admin Ativo
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create User Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <UserPlus className="text-emerald-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Novo Usuário</h2>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome do usuário"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Senha</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  />
                </div>

                {message && (
                  <div className={cn(
                    "p-3 rounded-xl text-xs flex items-center gap-2 border",
                    message.type === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                  )}>
                    {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 shadow-lg shadow-emerald-100"
                >
                  {isCreating ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                  Criar Usuário
                </button>
                <p className="text-[10px] text-gray-400 text-center italic">
                  * Criar um usuário irá deslogar você da conta atual.
                </p>
              </form>
            </div>
          </div>

          {/* Users List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Users className="text-gray-400" size={24} />
                  <h2 className="text-xl font-bold text-gray-900">Usuários Cadastrados</h2>
                  <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-bold">
                    {users.length}
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    className="bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm w-full md:w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-wider font-bold">
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4">E-mail</th>
                      <th className="px-6 py-4">Função</th>
                      <th className="px-6 py-4">Criado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={32} />
                          <p className="text-sm text-gray-400">Carregando usuários...</p>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                                {u.displayName?.charAt(0) || u.email?.charAt(0)}
                              </div>
                              <span className="text-sm font-semibold text-gray-900">{u.displayName || 'Sem nome'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                              <Mail size={14} />
                              {u.email}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                              u.role === 'admin' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                            {u.createdAt.toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
