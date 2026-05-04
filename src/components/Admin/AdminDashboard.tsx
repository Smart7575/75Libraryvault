import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Trash2, 
  Users, 
  MessageSquare, 
  Activity as ActivityIcon,
  Search,
  X,
  Lock
} from 'lucide-react';
import { UserProfile, userService } from '../../services/userService';
import { socialService, Activity } from '../../services/socialService';
import { cn } from '../../lib/utils';
import { auth } from '../../lib/firebase';

const ADMIN_PASSWORD = 'Admin@Library75'; // In a real app, this would be more secure or managed via custom claims

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [view, setView] = useState<'users' | 'activities' | 'chats'>('users');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Onjuist wachtwoord.');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, view]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'users') {
        const allUsers = await socialService.getAllUsers();
        setUsers(allUsers);
      } else if (view === 'activities') {
        // We'll use a one-off fetch for admin view instead of subscription
        // but for now socialService.getActivities uses onSnapshot.
        // Let's just use the existing one and wrap it.
        const unsubscribe = socialService.getActivities((data) => {
          setActivities(data);
          setLoading(false);
        });
        return () => unsubscribe();
      }
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      if (view !== 'activities') setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm('Weet je zeker dat je deze gebruiker wilt verwijderen? Dit is onomkeerbaar.')) {
      await userService.deleteUser(uid);
      setUsers(prev => prev.filter(u => u.uid !== uid));
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (window.confirm('Activiteit verwijderen?')) {
      await socialService.deleteActivity(id);
      setActivities(prev => prev.filter(a => a.id !== id));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-editorial-border p-12 max-w-md w-full shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-editorial-accent/10 flex items-center justify-center rounded-full mx-auto mb-6">
            <Lock className="text-editorial-accent" size={32} />
          </div>
          <h2 className="text-2xl font-serif font-black uppercase tracking-tight italic mb-8">Admin Toegang</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Voer wachtwoord in</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-editorial-border p-4 bg-editorial-bg focus:ring-0 focus:border-editorial-accent outline-none font-mono"
                autoFocus
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-xs italic">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-editorial-accent text-white p-4 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
            >
              Ontgrendel Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="pb-8 border-b border-editorial-border flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-black tracking-tight italic">Administrator Dashboard</h2>
          <p className="text-sm font-serif italic text-black/40">Beheer gebruikers en platformactiviteit</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('users')}
            className={cn(
              "px-6 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all",
              view === 'users' ? "bg-editorial-text text-white" : "border-editorial-border hover:bg-black/5"
            )}
          >
            <Users size={14} className="inline mr-2" /> Gebruikers
          </button>
          <button 
            onClick={() => setView('activities')}
            className={cn(
              "px-6 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all",
              view === 'activities' ? "bg-editorial-text text-white" : "border-editorial-border hover:bg-black/5"
            )}
          >
            <ActivityIcon size={14} className="inline mr-2" /> Activiteiten
          </button>
        </div>
      </div>

      <div className="bg-white border border-editorial-border shadow-sm">
        {loading ? (
          <div className="p-20 text-center italic text-black/30">Laden...</div>
        ) : view === 'users' ? (
          <div className="divide-y divide-editorial-border">
            {users.map(u => (
              <div key={u.uid} className="p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-4">
                  <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-12 h-12 border border-editorial-border" />
                  <div>
                    <h4 className="font-bold uppercase tracking-tight">{u.displayName}</h4>
                    <p className="text-[10px] text-black/40 font-mono">{u.email}</p>
                    <p className="text-[10px] text-black/40 italic font-serif">UID: {u.uid}</p>
                  </div>
                </div>
                {u.email !== auth.currentUser?.email && (
                  <button 
                    onClick={() => handleDeleteUser(u.uid)}
                    className="p-3 text-black/20 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
                    title="Verwijder Gebruiker"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-editorial-border">
            {activities.map(a => (
              <div key={a.id} className="p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-editorial-accent rounded-full"></div>
                  <div>
                    <p className="text-xs">
                      <span className="font-bold">{a.userName}</span> 
                      <span className="mx-2 text-black/40 opacity-50">→</span>
                      <span className="italic font-serif">{a.type}</span>
                      <span className="mx-2 text-black/40 opacity-50">→</span>
                      <span className="font-bold uppercase tracking-tight text-[10px]">{a.bookTitle}</span>
                    </p>
                    <p className="text-[10px] text-black/40 mt-1 uppercase font-bold tracking-widest">
                      {a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : 'Recent'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => a.id && handleDeleteActivity(a.id)}
                  className="p-3 text-black/20 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
                  title="Verwijder Activiteit"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="p-20 text-center italic text-black/30">Geen activiteiten gevonden.</div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 bg-red-50 border border-red-100 flex items-start gap-4">
        <ShieldAlert className="text-red-500 shrink-0" size={20} />
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-red-900">Pas op: Administratieve Bevoegdheden</p>
          <p className="text-[10px] leading-relaxed text-red-700 font-serif italic">
            Als administrator heb je de mogelijkheid om gegevens definitief te verwijderen uit de database. 
            Deze acties zijn onomkeerbaar en hebben direct effect op alle gebruikers.
          </p>
        </div>
      </div>
    </div>
  );
}
