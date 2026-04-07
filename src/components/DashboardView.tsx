import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { Transaction, UserProfile } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Calendar, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { cn } from '../lib/utils';

interface DashboardViewProps {
  user: UserProfile;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'];

export default function DashboardView({ user }: DashboardViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState<'current' | 'last' | 'all'>('current');

  useEffect(() => {
    if (!auth.currentUser) return;

    const path = `users/${auth.currentUser.uid}/transactions`;
    const q = query(collection(db, path), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
        createdAt: (doc.data().createdAt as Timestamp).toDate()
      })) as Transaction[];
      setTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    if (dateRange === 'all') return transactions;
    
    const start = dateRange === 'current' ? startOfMonth(now) : startOfMonth(subMonths(now, 1));
    const end = dateRange === 'current' ? endOfMonth(now) : endOfMonth(subMonths(now, 1));

    return transactions.filter(t => isWithinInterval(t.date, { start, end }));
  }, [transactions, dateRange]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  const pieData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const barData = useMemo(() => {
    const income = stats.income;
    const expenses = stats.expenses;
    return [{ name: 'Summary', income, expenses }];
  }, [stats]);

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 md:p-6 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral Financeira</h1>
          <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
            {(['current', 'last', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                  dateRange === range ? "bg-emerald-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                {range === 'current' ? 'Este Mês' : range === 'last' ? 'Mês Passado' : 'Tudo'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.currency} {stats.income.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Despesa Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.currency} {stats.expenses.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Saldo Líquido</p>
              <p className={cn("text-2xl font-bold", stats.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {user.currency} {stats.balance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Despesas por Categoria</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Receita vs Despesas</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="name" hide />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transações Recentes</h3>
            <Calendar size={20} className="text-gray-400" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredTransactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    tx.type === 'income' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                  )}>
                    {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{tx.description || tx.category}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{format(tx.date, 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("font-bold", tx.type === 'income' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {tx.type === 'income' ? '+' : '-'}{user.currency} {tx.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{tx.category}</p>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                Nenhuma transação encontrada para este período.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
