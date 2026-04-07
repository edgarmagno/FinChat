import React, { useState } from 'react';
import { auth, signOut } from '../lib/firebase';
import { UserProfile, DEFAULT_CATEGORIES } from '../types';
import { LogOut, User as UserIcon, Globe, Tag, CreditCard, Plus, X, ChevronRight, ChevronLeft, Moon, Sun } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

interface SettingsViewProps {
  user: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function SettingsView({ user, onUpdateProfile }: SettingsViewProps) {
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const handleCurrencyChange = async (currency: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { currency });
      onUpdateProfile({ ...user, currency });
    } catch (error) {
      console.error("Error updating currency:", error);
    }
  };

  const handleDarkModeToggle = async () => {
    if (!auth.currentUser) return;
    const newDarkMode = !user.darkMode;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { darkMode: newDarkMode });
      onUpdateProfile({ ...user, darkMode: newDarkMode });
    } catch (error) {
      console.error("Error updating dark mode:", error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim() || !auth.currentUser) return;
    
    const updatedCategories = [...(user.categories || DEFAULT_CATEGORIES), newCategory.trim()];
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { categories: updatedCategories });
      onUpdateProfile({ ...user, categories: updatedCategories });
      setNewCategory('');
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleRemoveCategory = async (categoryToRemove: string) => {
    if (!auth.currentUser) return;
    const updatedCategories = (user.categories || DEFAULT_CATEGORIES).filter(c => c !== categoryToRemove);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { categories: updatedCategories });
      onUpdateProfile({ ...user, categories: updatedCategories });
    } catch (error) {
      console.error("Error removing category:", error);
    }
  };

  if (isManagingCategories) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 md:p-6 transition-colors">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsManagingCategories(false)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Categorias</h1>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nome da nova categoria"
                className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
              />
              <button
                type="submit"
                disabled={!newCategory.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white p-2 rounded-xl transition-colors"
              >
                <Plus size={20} />
              </button>
            </form>

            <div className="space-y-2">
              {(user.categories || DEFAULT_CATEGORIES).map((cat) => (
                <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{cat}</span>
                  <button
                    onClick={() => handleRemoveCategory(cat)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 md:p-6 transition-colors">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ajustes</h1>

        {/* Profile Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden flex items-center justify-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Usuário'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={32} className="text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{user.displayName || 'Usuário'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{user.email?.split('@')[0]}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Moeda Padrão</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Usada para todos os cálculos</p>
                </div>
              </div>
              <select
                value={user.currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
              >
                <option value="BRL">BRL (R$)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <Tag size={20} className="text-gray-400 dark:text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Categorias</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.categories?.length || DEFAULT_CATEGORIES.length} categorias ativas</p>
                </div>
              </div>
              <button 
                onClick={() => setIsManagingCategories(true)}
                className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:underline flex items-center gap-1"
              >
                Gerenciar
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                {user.darkMode ? <Moon size={20} className="text-gray-400 dark:text-gray-500" /> : <Sun size={20} className="text-gray-400 dark:text-gray-500" />}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Modo Noturno</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Alternar tema visual</p>
                </div>
              </div>
              <button 
                onClick={handleDarkModeToggle}
                className={cn(
                  "w-12 h-6 rounded-full p-1 transition-colors relative",
                  user.darkMode ? "bg-emerald-600" : "bg-gray-300"
                )}
              >
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full transition-transform",
                  user.darkMode ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* App Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Ações da Conta</h3>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-semibold py-3 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">FinChat v1.0.0</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Protegido por Google AI & Firebase</p>
        </div>
      </div>
    </div>
  );
}
