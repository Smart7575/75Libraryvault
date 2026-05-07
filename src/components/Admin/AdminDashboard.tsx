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
import { useLanguage } from '../../lib/LanguageContext';

const ADMIN_PASSWORD = 'Admin@Library75'; // In a real app, this would be more secure or managed via custom claims

export default function AdminDashboard({ isDarkMode }: { isDarkMode?: boolean }) {
  const { t } = useLanguage();
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
      setError(t('admin.incorrectPassword') || 'Onjuist wachtwoord.');
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
    if (window.confirm(t('admin.deleteUserConfirm') || 'Weet je zeker dat je deze gebruiker wilt verwijderen? Dit is onomkeerbaar.')) {
      await userService.deleteUser(uid);
      setUsers(prev => prev.filter(u => u.uid !== uid));
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (window.confirm(t('admin.deleteActivityConfirm') || 'Activiteit verwijderen?')) {
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
          className={cn(
            "p-12 max-w-md w-full shadow-2xl text-center border",
            isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border"
          )}
        >
          <div className={cn("w-16 h-16 flex items-center justify-center rounded-full mx-auto mb-6", isDarkMode ? "bg-zinc-950" : "bg-editorial-accent/10")}>
            <Lock className={isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent"} size={32} />
          </div>
          <h2 className="text-2xl font-serif font-black uppercase tracking-tight italic mb-8">{t('admin.access') || 'Admin Toegang'}</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-white/40" : "text-black/40")}>{t('admin.enterPassword') || 'Voer wachtwoord in'}</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={cn(
                  "w-full border p-4 focus:ring-0 focus:border-editorial-accent-bright outline-none font-mono transition-colors",
                  isDarkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder:text-white/20" : "bg-editorial-bg border-editorial-border"
                )}
                autoFocus
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-xs italic">{error}</p>}
            <button 
              type="submit"
              className={cn(
                "w-full p-4 text-[10px] font-bold uppercase tracking-widest transition-colors",
                isDarkMode ? "bg-white text-zinc-900 hover:bg-neutral-200" : "bg-editorial-accent text-white hover:bg-neutral-800"
              )}
            >
              {t('admin.unlock') || 'Ontgrendel Dashboard'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className={cn("pb-8 border-b flex items-center justify-between", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
        <div>
          <h2 className="text-4xl font-serif font-black tracking-tight italic leading-none">{t('admin.dashboard') || 'Dashboard'}</h2>
          <p className={cn("text-sm font-serif italic mt-1", isDarkMode ? "text-white/40" : "text-black/40")}>{t('admin.manageUsers') || 'Beheer gebruikers en platformactiviteit'}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('users')}
            className={cn(
              "px-6 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all",
              view === 'users' 
                ? (isDarkMode ? "bg-white text-zinc-900 font-black" : "bg-editorial-text text-white") 
                : (isDarkMode ? "bg-zinc-900 border-zinc-800 text-white/40 hover:text-white" : "border-editorial-border hover:bg-black/5")
            )}
          >
            <Users size={14} className="inline mr-2" /> {t('admin.users')}
          </button>
          <button 
            onClick={() => setView('activities')}
            className={cn(
              "px-6 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all",
              view === 'activities' 
                ? (isDarkMode ? "bg-white text-zinc-900 font-black" : "bg-editorial-text text-white") 
                : (isDarkMode ? "bg-zinc-900 border-zinc-800 text-white/40 hover:text-white" : "border-editorial-border hover:bg-black/5")
            )}
          >
            <ActivityIcon size={14} className="inline mr-2" /> {t('admin.activities')}
          </button>
        </div>
      </div>

      <div className={cn("border shadow-sm overflow-hidden", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border")}>
        {loading ? (
          <div className="p-20 text-center italic text-black/30">{t('admin.loading') || 'Laden...'}</div>
        ) : view === 'users' ? (
          <div className={cn("divide-y", isDarkMode ? "divide-zinc-800" : "divide-editorial-border")}>
            {users.map(u => (
              <div key={u.uid} className={cn("p-6 flex items-center justify-between transition-colors", isDarkMode ? "hover:bg-zinc-800/50" : "hover:bg-neutral-50")}>
                <div className="flex items-center gap-4">
                  <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className={cn("w-12 h-12 border", isDarkMode ? "border-zinc-800" : "border-editorial-border")} />
                  <div>
                    <h4 className={cn("font-bold uppercase tracking-tight", isDarkMode ? "text-white" : "text-black")}>{u.displayName}</h4>
                    <p className={cn("text-[10px] font-mono", isDarkMode ? "text-white/40" : "text-black/40")}>{u.email}</p>
                    <p className={cn("text-[10px] italic font-serif", isDarkMode ? "text-white/20" : "text-black/40")}>UID: {u.uid}</p>
                  </div>
                </div>
                {u.email !== auth.currentUser?.email && (
                  <button 
                    onClick={() => handleDeleteUser(u.uid)}
                    className={cn(
                      "p-3 transition-all border border-transparent hover:border-red-500 hover:text-red-500",
                      isDarkMode ? "text-white/10" : "text-black/20"
                    )}
                    title={t('admin.deleteUserTooltip') || "Verwijder Gebruiker"}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={cn("divide-y", isDarkMode ? "divide-zinc-800" : "divide-editorial-border")}>
            {activities.map(a => (
              <div key={a.id} className={cn("p-6 flex items-center justify-between transition-colors", isDarkMode ? "hover:bg-zinc-800/50" : "hover:bg-neutral-50")}>
                <div className="flex items-center gap-4">
                  <div className={cn("w-2 h-2 rounded-full", isDarkMode ? "bg-editorial-accent-bright" : "bg-editorial-accent")}></div>
                  <div>
                    <p className="text-xs">
                      <span className={cn("font-bold", isDarkMode ? "text-white" : "text-editorial-text")}>{a.userName}</span> 
                      <span className={cn("mx-2 opacity-50", isDarkMode ? "text-white/20" : "text-black/40")}>→</span>
                      <span className={cn("italic font-serif", isDarkMode ? "text-white/60" : "text-black/40")}>
                        {a.type === 'is begonnen met' ? t('social.activities.started') :
                         a.type === 'heeft' ? t('social.activities.finished') :
                         a.type === 'beoordeelde' ? t('social.activities.rated') : a.type}
                      </span>
                      <span className={cn("mx-2 opacity-50", isDarkMode ? "text-white/20" : "text-black/40")}>→</span>
                      <span className={cn("font-bold uppercase tracking-tight text-[10px]", isDarkMode ? "text-white/80" : "text-editorial-text")}>{a.bookTitle}</span>
                    </p>
                    <p className={cn("text-[10px] mt-1 uppercase font-bold tracking-widest", isDarkMode ? "text-white/40" : "text-black/40")}>
                      {a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : (t('admin.recent') || 'Recent')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => a.id && handleDeleteActivity(a.id)}
                  className={cn(
                    "p-3 transition-all border border-transparent hover:border-red-500 hover:text-red-500",
                    isDarkMode ? "text-white/10" : "text-black/20"
                  )}
                  title={t('admin.deleteActivityTooltip') || "Verwijder Activiteit"}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="p-20 text-center italic text-black/30">{t('admin.noActivities') || 'Geen activiteiten gevonden.'}</div>
            )}
          </div>
        )}
      </div>

      <div className={cn("p-6 flex items-start gap-4 border", isDarkMode ? "bg-red-950/20 border-red-900/50" : "bg-red-50 border-red-100")}>
        <ShieldAlert className="text-red-500 shrink-0" size={20} />
        <div className="space-y-1">
          <p className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-red-400" : "text-red-900")}>{t('admin.warningTitle') || 'Pas op: Administratieve Bevoegdheden'}</p>
          <p className={cn("text-[10px] leading-relaxed font-serif italic", isDarkMode ? "text-red-400" : "text-red-700")}>
            {t('admin.warningDesc') || 'Als administrator heb je de mogelijkheid om gegevens definitief te verwijderen uit de database. Deze acties zijn onomkeerbaar en hebben direct effect op alle gebruikers.'}
          </p>
        </div>
      </div>
    </div>
  );
}
