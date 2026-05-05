import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Search, Send, User, Check } from 'lucide-react';
import { UserProfile, userService } from '../../services/userService';
import { socialService } from '../../services/socialService';
import { Book } from '../../services/bookService';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface ShareBookModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export default function ShareBookModal({ book, isOpen, onClose, isDarkMode }: ShareBookModalProps) {
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!auth.currentUser) return;
      try {
        const allUsers = await socialService.getAllUsers();
        setContacts(allUsers.filter(u => u.uid !== auth.currentUser?.uid));
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    if (isOpen) fetchContacts();
  }, [isOpen]);

  const filteredContacts = contacts.filter(c => 
    c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShare = async () => {
    if (!selectedUser || !auth.currentUser || !book.storageUrl) return;

    setIsSending(true);
    try {
      const messageText = `Hoi! Ik deel de opslaglocatie van het boek "${book.title}" met je.`;
      await socialService.sendMessage(
        auth.currentUser.uid, 
        selectedUser.uid, 
        messageText,
        {
          bookId: book.id!,
          bookTitle: book.title,
          storageUrl: book.storageUrl
        }
      );
      setSendSuccess(true);
      setTimeout(() => {
        onClose();
        setSendSuccess(false);
        setSelectedUser(null);
      }, 2000);
    } catch (error) {
      console.error('Error sharing book location:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          "w-full max-w-md border shadow-2xl flex flex-col max-h-[80vh] transition-colors",
          isDarkMode ? "bg-zinc-900 border-zinc-800 text-neutral-100" : "bg-white border-editorial-border text-editorial-text"
        )}
      >
        <div className={cn("p-6 border-b flex items-center justify-between", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
          <div>
            <h2 className="text-xl font-serif italic font-black">Locatie Delen</h2>
            <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", isDarkMode ? "text-zinc-500" : "text-black/40")}>Deel "{book.title}"</p>
          </div>
          <button onClick={onClose} className={cn("p-2 transition-colors", isDarkMode ? "text-zinc-500 hover:text-editorial-accent" : "hover:text-editorial-accent")}>
            <X size={20} />
          </button>
        </div>

        <div className={cn("p-4 border-b", isDarkMode ? "border-zinc-800 bg-zinc-950/50" : "border-editorial-border bg-editorial-bg/30")}>
          <div className="relative">
            <Search size={14} className={cn("absolute left-3 top-1/2 -translate-y-1/2", isDarkMode ? "text-zinc-600" : "text-black/30")} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek een gebruiker..."
              className={cn(
                "w-full border pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-editorial-accent transition-all",
                isDarkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-700" : "bg-white border-editorial-border text-editorial-text"
              )}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className={cn("p-10 text-center animate-pulse italic font-serif", isDarkMode ? "text-zinc-700" : "opacity-30")}>Gebruikers laden...</div>
          ) : filteredContacts.length === 0 ? (
            <div className={cn("p-10 text-center italic font-serif", isDarkMode ? "text-zinc-700" : "text-black/30")}>Geen gebruikers gevonden.</div>
          ) : (
            filteredContacts.map(user => (
              <div 
                key={user.uid}
                onClick={() => setSelectedUser(user)}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer transition-all border",
                  selectedUser?.uid === user.uid 
                    ? (isDarkMode ? "bg-zinc-100 text-zinc-900 border-zinc-100" : "bg-editorial-text text-white border-editorial-text") 
                    : (isDarkMode ? "border-transparent hover:bg-zinc-800 text-zinc-400" : "border-transparent hover:bg-editorial-bg text-editorial-text")
                )}
              >
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt={user.displayName} 
                  className={cn("w-8 h-8 object-cover border", isDarkMode ? "border-zinc-800" : "border-editorial-border")}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate uppercase tracking-tight">{user.displayName}</p>
                </div>
                {selectedUser?.uid === user.uid && <Check size={14} className="text-editorial-accent" />}
              </div>
            ))
          )}
        </div>

        <div className={cn("p-6 border-t mt-auto transition-colors", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border")}>
          <button 
            onClick={handleShare}
            disabled={!selectedUser || isSending || sendSuccess}
            className={cn(
              "w-full py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl",
              sendSuccess 
                ? "bg-green-600 text-white" 
                : (isDarkMode ? "bg-zinc-100 text-zinc-900 hover:bg-neutral-200" : "bg-editorial-text text-white hover:bg-neutral-800")
            )}
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : sendSuccess ? (
              <>
                <Check size={14} /> Gedeeld!
              </>
            ) : (
              <>
                <Send size={14} /> Deel opslaglocatie
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
