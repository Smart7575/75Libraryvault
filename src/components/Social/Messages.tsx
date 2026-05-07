import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  ChevronLeft, 
  User, 
  MoreVertical, 
  Search,
  MessageSquare,
  Clock,
  Check,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { Message, socialService } from '../../services/socialService';
import { UserProfile, userService } from '../../services/userService';
import { bookService } from '../../services/bookService';
import { auth } from '../../lib/firebase';
import { format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../lib/LanguageContext';

interface MessagesProps {
  initialChatUser?: UserProfile;
  onBack: () => void;
  isDarkMode?: boolean;
}

export default function Messages({ initialChatUser, onBack, isDarkMode }: MessagesProps) {
  const { t, language } = useLanguage();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(initialChatUser || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [contactList, setContactList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptedMessages, setAcceptedMessages] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch users current user is following or who follow current user
    const fetchContacts = async () => {
      if (!auth.currentUser) return;
      const allUsers = await socialService.getAllUsers();
      // For simplicity, any user can be messaged for now (or strictly followed ones)
      setContactList(allUsers.filter(u => u.uid !== auth.currentUser?.uid));
      setLoading(false);
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedUser && auth.currentUser) {
      // Refresh selected user profile to ensure latest photo
      userService.getProfile(selectedUser.uid).then(profile => {
        if (profile) setSelectedUser(profile);
      });

      const unsubscribe = socialService.getMessages(auth.currentUser.uid, selectedUser.uid, (data) => {
        setMessages(data);
      });
      return () => unsubscribe();
    }
  }, [selectedUser?.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !auth.currentUser) return;

    await socialService.sendMessage(auth.currentUser.uid, selectedUser.uid, newMessage.trim());
    setNewMessage('');
  };

  return (
    <div className={cn(
      "max-w-6xl mx-auto h-[80vh] flex border shadow-2xl overflow-hidden font-sans",
      isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border"
    )}>
      {/* Contact List Sidebar */}
      <div className={cn(
        "w-full md:w-80 border-r flex flex-col transition-all",
        isDarkMode ? "border-zinc-800 bg-zinc-950/30" : "border-editorial-border bg-editorial-bg/30",
        selectedUser ? "hidden md:flex" : "flex"
      )}>
        <div className={cn(
          "p-6 border-b flex items-center justify-between",
          isDarkMode ? "border-zinc-800 bg-zinc-900" : "border-editorial-border bg-white"
        )}>
           <h2 className="text-xl font-serif italic font-black">{t('social.messages') || 'Berichten'}</h2>
           <button onClick={onBack} className={cn("p-2 transition-colors", isDarkMode ? "hover:text-editorial-accent-bright" : "hover:text-editorial-accent")}><ChevronLeft size={20} /></button>
        </div>
        
        <div className="p-4">
           <div className="relative">
             <Search size={14} className={cn("absolute left-3 top-1/2 -translate-y-1/2", isDarkMode ? "text-white/30" : "text-black/20")} />
             <input 
               type="text" 
               placeholder={t('social.searchContacts') || "Zoek contacten..."} 
               className={cn(
                "w-full border pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-editorial-accent transition-all",
                isDarkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder:text-white/30" : "bg-white border-editorial-border text-editorial-text"
              )}
             />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className={cn("p-10 text-center animate-pulse italic font-serif", isDarkMode ? "text-white/40" : "opacity-30")}>{t('social.loadingContacts') || 'Contacten laden...'}</div>
          ) : (
            contactList.map((user) => (
              <div 
                key={user.uid}
                onClick={() => setSelectedUser(user)}
                className={cn(
                  "flex items-center gap-4 p-4 cursor-pointer transition-all border-b",
                  isDarkMode 
                    ? (selectedUser?.uid === user.uid ? "bg-zinc-800 border-l-2 border-l-editorial-accent-bright border-zinc-700" : "hover:bg-zinc-800/50 border-zinc-800/50") 
                    : (selectedUser?.uid === user.uid ? "bg-white border-l-2 border-l-editorial-accent border-editorial-border/50" : "hover:bg-white border-editorial-border/50")
                )}
              >
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="Avatar" 
                  className={cn("w-10 h-10 rounded-none border", isDarkMode ? "border-zinc-800" : "border-editorial-border")}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className={cn("font-bold text-xs truncate truncate-text tracking-wide", isDarkMode ? "text-white" : "text-editorial-text")}>{user.displayName}</p>
                    <span className={cn("text-[8px] font-bold uppercase", isDarkMode ? "text-white/40" : "text-black/30")}>12:30</span>
                  </div>
                  <p className={cn("text-[10px] font-serif italic truncate", isDarkMode ? "text-white/40" : "text-black/40")}>{t('social.lastMessageSample') || 'Laatste getypte bericht...'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col",
        isDarkMode ? "bg-zinc-950/20" : "bg-white",
        !selectedUser ? "hidden md:flex" : "flex"
      )}>
        {selectedUser ? (
          <>
            {/* Header */}
            <div className={cn(
              "p-6 border-b flex items-center justify-between shadow-sm relative z-10",
              isDarkMode ? "border-zinc-800 bg-zinc-900 shadow-none" : "border-editorial-border bg-white"
            )}>
               <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-4"><ChevronLeft size={20} /></button>
                  <img 
                    src={selectedUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.uid}`} 
                    alt="Avatar" 
                    className={cn("w-10 h-10 rounded-none border", isDarkMode ? "border-zinc-800" : "border-editorial-border")}
                  />
                  <div>
                    <h3 className="font-serif italic font-black text-lg leading-none mb-1">{selectedUser.displayName}</h3>
                    <p className={cn("text-[9px] font-bold uppercase tracking-widest flex items-center gap-1", isDarkMode ? "text-editorial-accent-bright" : "text-green-600")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isDarkMode ? "bg-editorial-accent-bright" : "bg-green-600")}></span> {t('social.onlineStatus') || 'Online'}
                    </p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button className={cn("p-2 transition-colors", isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-black/20 hover:text-editorial-text")}><MoreVertical size={20} /></button>
               </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className={cn(
                "flex-1 overflow-y-auto p-10 space-y-6 bg-fixed transition-colors",
                isDarkMode 
                  ? "bg-zinc-900 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" 
                  : "bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]"
              )}
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10 text-center p-20 grayscale">
                    <MessageSquare size={64} className="mb-4" />
                    <p className="font-serif italic text-xl">{t('social.sharePassion') || 'Deel je passie voor boeken.'}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-2">{t('social.noMessages') || 'Geen berichten in dit gesprek'}</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.senderId === auth.currentUser?.uid;
                  return (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, x: isOwn ? 20 : -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      key={m.id} 
                      className={cn(
                        "flex flex-col max-w-[80%] ",
                        isOwn ? "self-end items-end" : "self-start items-start"
                      )}
                    >
                      {userService.isAdmin(auth.currentUser?.email) && (
                         <button 
                           onClick={() => m.id && window.confirm(t('social.confirmDeleteMessage') || 'Bericht verwijderen?') && socialService.deleteMessage(m.id)}
                           className={cn(
                             "mb-1 p-1 transition-colors",
                             isDarkMode ? "text-zinc-800 hover:text-red-500" : "text-black/10 hover:text-red-500",
                             isOwn ? "mr-1" : "ml-1"
                           )}
                           title={t('social.deleteMessage') || "Bericht verwijderen"}
                         >
                           <Trash2 size={10} />
                         </button>
                      )}
                      <div className={cn(
                        "p-4 shadow-sm border text-sm message-bubble flex flex-col gap-3 transition-colors",
                        isOwn 
                          ? (isDarkMode ? "bg-white text-zinc-900 border-white" : "bg-editorial-text text-white border-editorial-text") 
                          : (isDarkMode ? "bg-zinc-800 text-white border-zinc-700" : "bg-white text-editorial-text border-editorial-border")
                      )}>
                        <span>{m.text}</span>
                        {m.type === 'BOOK_PUSH' && m.bookDataSnippet && (
                          <div className={cn(
                            "mt-2 p-4 border flex flex-col gap-4 shadow-md",
                            isOwn 
                              ? (isDarkMode ? "bg-zinc-900/50 border-zinc-900/20" : "bg-white/10 border-white/20") 
                              : (isDarkMode ? "bg-zinc-950/50 border-zinc-900" : "bg-neutral-50 border-editorial-border")
                          )}>
                            <div className="flex gap-3">
                               {m.bookDataSnippet.coverUrl ? (
                                 <img src={m.bookDataSnippet.coverUrl} className="w-16 h-20 object-cover shadow-sm border border-black/5" referrerPolicy="no-referrer" alt="" />
                               ) : (
                                 <div className="w-16 h-20 bg-black/5 flex items-center justify-center italic text-lg font-serif">?</div>
                               )}
                               <div className="flex-1 min-w-0">
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1", isDarkMode ? "text-white" : "")}>{t('social.pushedBook') || 'Gepusht boek'}</p>
                                  <p className="font-serif italic font-black text-sm leading-tight line-clamp-2 mb-1">{m.bookTitle}</p>
                                  <p className="text-[10px] italic opacity-60">{m.bookDataSnippet.authors?.join(', ')}</p>
                               </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              {m.storageUrl && (
                                <a 
                                  href={m.storageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    "flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all border",
                                    isOwn 
                                      ? (isDarkMode ? "bg-zinc-900/50 border-zinc-700 text-white hover:bg-black" : "bg-white/50 border-white/50 text-editorial-text hover:bg-neutral-100") 
                                      : (isDarkMode ? "bg-zinc-900 border-zinc-800 text-white hover:bg-black" : "bg-white border-editorial-border text-editorial-text hover:bg-neutral-100")
                                  )}
                                >
                                  <ExternalLink size={12} />
                                  {t('social.viewLocation') || 'Kijk Locatie'}
                                </a>
                              )}
                              
                              {!isOwn && (
                                <button
                                  onClick={async () => {
                                    if (acceptedMessages[m.id || '']) return;
                                    try {
                                      await bookService.addSharedBook(m.bookDataSnippet, m.storageUrl);
                                      if (m.id) {
                                        setAcceptedMessages(prev => ({ ...prev, [m.id!]: true }));
                                      }
                                    } catch (err) {
                                      console.error('Accept book error:', err);
                                    }
                                  }}
                                  disabled={acceptedMessages[m.id || '']}
                                  className={cn(
                                    "flex items-center justify-center gap-2 px-3 py-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                                    acceptedMessages[m.id || '']
                                      ? "bg-green-100 text-green-700 cursor-default"
                                      : (isDarkMode ? "bg-editorial-accent-bright text-zinc-900 hover:bg-white" : "bg-editorial-accent text-white hover:bg-neutral-800")
                                  )}
                                >
                                  {acceptedMessages[m.id || ''] ? (
                                    <>
                                      <Check size={12} />
                                      {t('social.accepted') || 'Toegevoegd'}
                                    </>
                                  ) : (
                                    <>
                                      <Check size={12} />
                                      {t('social.acceptBook') || 'Accepteren'}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {m.storageUrl && m.type !== 'BOOK_PUSH' && (
                          <div className={cn(
                            "mt-2 p-3 border flex flex-col gap-2",
                            isOwn 
                              ? (isDarkMode ? "bg-zinc-900/5 border-zinc-900/10" : "bg-white/10 border-white/20") 
                              : (isDarkMode ? "bg-zinc-950/50 border-zinc-900" : "bg-neutral-50 border-editorial-border")
                          )}>
                            <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-60", isDarkMode ? "text-white" : "")}>{t('social.sharedBook') || 'Gedeelde opslaglocatie'}</p>
                            <p className="font-serif italic font-bold">{m.bookTitle}</p>
                            <a 
                              href={m.storageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                isOwn 
                                  ? (isDarkMode ? "bg-zinc-900 text-white hover:bg-black" : "bg-white text-editorial-text hover:bg-neutral-100") 
                                  : (isDarkMode ? "bg-white text-zinc-900 hover:bg-neutral-200" : "bg-editorial-text text-white hover:bg-neutral-800")
                              )}
                            >
                              <ExternalLink size={12} />
                              {t('social.openLocation') || 'Open Locatie'}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <span className={cn("text-[8px] font-bold uppercase tracking-widest italic", isDarkMode ? "text-white/40" : "opacity-30")}>
                          {m.createdAt ? format(m.createdAt.toDate(), 'HH:mm', { locale: language === 'nl' ? nl : enUS }) : '...'}
                        </span>
                        {isOwn && <Check size={10} className={cn("opacity-50", isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent")} />}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className={cn("p-6 border-t flex gap-4 items-center transition-colors", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-editorial-bg/30 border-editorial-border")}>
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('social.typeMessage') || "Typ een bericht..."}
                className={cn(
                  "flex-1 border px-6 py-4 rounded-none text-sm focus:outline-none focus:placeholder-transparent focus:border-editorial-accent transition-all shadow-inner",
                  isDarkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-editorial-border"
                )}
              />
              <button 
                type="submit"
                className={cn(
                  "p-4 transition-all shadow-xl disabled:opacity-50",
                  isDarkMode ? "bg-zinc-100 text-zinc-900 hover:bg-white" : "bg-editorial-accent text-white hover:bg-neutral-800"
                )}
                disabled={!newMessage.trim()}
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className={cn("flex-1 flex flex-col items-center justify-center p-20 text-center transition-colors", isDarkMode ? "bg-zinc-900 text-white/40" : "opacity-30 text-editorial-text")}>
             <MessageSquare size={80} className={cn("mb-6", isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent")} />
             <h2 className="text-3xl font-serif italic mb-4">{t('social.selectReader') || 'Mijn Berichten'}</h2>
             <p className="max-w-md font-serif italic text-lg leading-relaxed">
               {t('social.selectReaderDesc') || 'Selecteer een lezer uit de lijst aan de linkerkant om een gesprek te starten of te hervatten.'}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
