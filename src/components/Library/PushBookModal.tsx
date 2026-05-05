import React, { useState, useEffect } from 'react';
import { X, Send, Search, Check, Smartphone, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Book } from '../../services/bookService';
import { socialService } from '../../services/socialService';
import { UserProfile } from '../../services/userService';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface PushBookModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export default function PushBookModal({ book, isOpen, onClose, isDarkMode }: PushBookModalProps) {
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [includeStorage, setIncludeStorage] = useState(true);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && auth.currentUser) {
      const fetchFollowing = async () => {
        setLoading(true);
        const profiles = await socialService.getFollowingProfiles(auth.currentUser!.uid);
        setFollowing(profiles);
        setLoading(false);
      };
      fetchFollowing();
    }
  }, [isOpen]);

  const handlePush = async () => {
    if (!selectedUser || !auth.currentUser) return;
    setIsSending(true);

    try {
      const pushText = message.trim() || `Ik heb dit boek naar je gepusht: ${book.title}`;
      
      // Construct message data
      // We send full book data as a push so the receiver doesn't need to "read" the sender's book doc (which they might not have access to)
      await socialService.sendMessage(auth.currentUser.uid, selectedUser.uid, pushText, {
        bookId: book.id || '',
        bookTitle: book.title,
        storageUrl: includeStorage ? (book.storageUrl || '') : '',
        // We add a special flag so Messages knows it's a push and can show the Accept button
        type: 'BOOK_PUSH',
        bookDataSnippet: {
          title: book.title,
          authors: book.authors,
          series: book.series || '',
          seriesIndex: book.seriesIndex || 0,
          isbn: book.isbn || '',
          language: book.language || '',
          genre: book.genre || [],
          publishedDate: book.publishedDate || '',
          description: book.description || '',
          coverUrl: book.coverUrl || '',
          format: book.format || '',
          pageCount: book.pageCount || 0
        }
      } as any);

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Push error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredFollowing = following.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "w-full max-w-md rounded-none shadow-2xl overflow-hidden flex flex-col font-sans border",
              isDarkMode ? "bg-zinc-900 border-zinc-800 text-neutral-100" : "bg-white border-editorial-border text-editorial-text"
            )}
          >
            <div className={cn(
              "p-6 border-b flex items-center justify-between",
              isDarkMode ? "border-zinc-800 bg-zinc-950/20" : "border-editorial-border bg-editorial-bg/30"
            )}>
              <div className="flex items-center gap-3">
                <Smartphone size={18} className={isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent"} />
                <h3 className="text-xl font-serif italic font-black">Push naar Volger</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto max-h-[60vh] space-y-8">
              {success ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-6", isDarkMode ? "bg-editorial-accent-bright text-zinc-900" : "bg-editorial-accent text-white")}>
                    <Check size={32} />
                  </div>
                  <h4 className="text-2xl font-serif italic font-black mb-2">Verzonden!</h4>
                  <p className="text-sm opacity-60 font-serif italic">{selectedUser?.displayName} heeft je push ontvangen.</p>
                </div>
              ) : (
                <>
                  {/* Select Receiver */}
                  <div>
                    <label className={cn("text-[9px] font-bold uppercase tracking-[0.2em] mb-4 block italic", isDarkMode ? "text-zinc-500" : "text-black/40")}>Kies een volger</label>
                    <div className="relative mb-4">
                      <Search size={14} className={cn("absolute left-4 top-1/2 -translate-y-1/2", isDarkMode ? "text-white/30" : "text-black/20")} />
                      <input 
                        type="text" 
                        placeholder="Naam of email..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(
                          "w-full border pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-editorial-accent transition-all",
                          isDarkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-editorial-border"
                        )}
                      />
                    </div>

                    <div className={cn(
                      "border max-h-[200px] overflow-y-auto divide-y",
                      isDarkMode ? "border-zinc-800 divide-zinc-800" : "border-editorial-border divide-editorial-border"
                    )}>
                      {loading ? (
                        <div className="p-6 text-center italic text-xs animate-pulse opacity-40">Volgers laden...</div>
                      ) : filteredFollowing.length === 0 ? (
                        <div className="p-6 text-center italic text-xs opacity-40">Geen volgers gevonden.</div>
                      ) : (
                        filteredFollowing.map(u => (
                          <div 
                            key={u.uid}
                            onClick={() => setSelectedUser(u)}
                            className={cn(
                              "p-3 flex items-center gap-3 cursor-pointer transition-all",
                              selectedUser?.uid === u.uid 
                                ? (isDarkMode ? "bg-zinc-800" : "bg-neutral-100") 
                                : (isDarkMode ? "hover:bg-zinc-800/50" : "hover:bg-neutral-50")
                            )}
                          >
                            <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-8 h-8 object-cover border border-editorial-border" alt="" />
                            <div className="flex-1 min-w-0">
                               <p className="text-xs font-bold truncate">{u.displayName}</p>
                            </div>
                            {selectedUser?.uid === u.uid && <Check size={14} className={isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent"} />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-4 pt-4 border-t border-editorial-border dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className={cn("text-sm font-bold", isDarkMode ? "text-zinc-200" : "text-editorial-text")}>Voeg opslaglocatie toe</label>
                        <Info size={12} className="opacity-40 cursor-help" title="De ontvanger kan via de link het bestand downloaden als ze toegang hebben." />
                      </div>
                      <button 
                        onClick={() => setIncludeStorage(!includeStorage)}
                        className={cn(
                          "w-12 h-6 rounded-none relative transition-colors",
                          includeStorage ? "bg-editorial-accent" : (isDarkMode ? "bg-zinc-800" : "bg-neutral-200")
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 transition-all",
                          includeStorage ? "right-1 bg-white" : (isDarkMode ? "left-1 bg-zinc-600" : "left-1 bg-white")
                        )} />
                      </button>
                    </div>

                    <div>
                      <label className={cn("text-[9px] font-bold uppercase tracking-[0.2em] mb-2 block italic", isDarkMode ? "text-zinc-500" : "text-black/40")}>Bericht (optioneel)</label>
                      <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Bijv. Dit boek moet je echt lezen!"
                        className={cn(
                          "w-full border p-4 text-xs font-serif italic min-h-[80px] focus:outline-none focus:border-editorial-accent transition-all",
                          isDarkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-editorial-border"
                        )}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={cn(
              "p-6 border-t flex gap-4",
              isDarkMode ? "border-zinc-800 bg-zinc-950/20" : "border-editorial-border bg-editorial-bg/30"
            )}>
              <button 
                onClick={onClose}
                className={cn(
                  "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all",
                  isDarkMode ? "border-zinc-800 hover:bg-zinc-800" : "border-editorial-border hover:bg-neutral-100"
                )}
              >
                Annuleren
              </button>
              {!success && (
                <button 
                  onClick={handlePush}
                  disabled={!selectedUser || isSending}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl",
                    isDarkMode ? "bg-zinc-100 text-zinc-900 hover:bg-white" : "bg-editorial-accent text-white hover:bg-neutral-800",
                    (!selectedUser || isSending) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSending ? 'Versturen...' : (
                    <>
                      <Send size={14} />
                      Push Boek
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
