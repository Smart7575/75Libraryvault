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
  Trash2
} from 'lucide-react';
import { Message, socialService } from '../../services/socialService';
import { UserProfile, userService } from '../../services/userService';
import { auth } from '../../lib/firebase';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '../../lib/utils';

interface MessagesProps {
  initialChatUser?: UserProfile;
  onBack: () => void;
}

export default function Messages({ initialChatUser, onBack }: MessagesProps) {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(initialChatUser || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [contactList, setContactList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
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
    <div className="max-w-6xl mx-auto h-[80vh] flex border border-editorial-border bg-white shadow-2xl overflow-hidden font-sans">
      {/* Contact List Sidebar */}
      <div className={cn(
        "w-full md:w-80 border-r border-editorial-border flex flex-col bg-editorial-bg/30 transition-all",
        selectedUser ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 border-b border-editorial-border bg-white flex items-center justify-between">
           <h2 className="text-xl font-serif italic font-black">Berichten</h2>
           <button onClick={onBack} className="p-2 hover:text-editorial-accent transition-colors"><ChevronLeft size={20} /></button>
        </div>
        
        <div className="p-4">
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/20" />
             <input 
               type="text" 
               placeholder="Zoek contacten..." 
               className="w-full bg-white border border-editorial-border pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-editorial-accent"
             />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center animate-pulse opacity-30 italic font-serif">Contacten laden...</div>
          ) : (
            contactList.map((user) => (
              <div 
                key={user.uid}
                onClick={() => setSelectedUser(user)}
                className={cn(
                  "flex items-center gap-4 p-4 cursor-pointer hover:bg-white transition-all border-b border-editorial-border/50",
                  selectedUser?.uid === user.uid ? "bg-white border-l-2 border-l-editorial-accent" : ""
                )}
              >
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-none border border-editorial-border"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className="font-bold text-xs truncate truncate-text tracking-wide">{user.displayName}</p>
                    <span className="text-[8px] text-black/30 font-bold uppercase">12:30</span>
                  </div>
                  <p className="text-[10px] text-black/40 font-serif italic truncate">Laatste getypte bericht...</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-white",
        !selectedUser ? "hidden md:flex" : "flex"
      )}>
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-editorial-border flex items-center justify-between shadow-sm relative z-10">
               <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-4"><ChevronLeft size={20} /></button>
                  <img 
                    src={selectedUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.uid}`} 
                    alt="Avatar" 
                    className="w-10 h-10 rounded-none border border-editorial-border"
                  />
                  <div>
                    <h3 className="font-serif italic font-black text-lg leading-none mb-1">{selectedUser.displayName}</h3>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-green-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span> Online
                    </p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button className="p-2 text-black/20 hover:text-editorial-text transition-colors"><MoreVertical size={20} /></button>
               </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-10 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] bg-fixed"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10 text-center p-20 grayscale">
                    <MessageSquare size={64} className="mb-4" />
                    <p className="font-serif italic text-xl">Deel je passie voor boeken.</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Geen berichten in dit gesprek</p>
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
                           onClick={() => m.id && window.confirm('Bericht verwijderen?') && socialService.deleteMessage(m.id)}
                           className={cn(
                             "mb-1 p-1 text-black/10 hover:text-red-500 transition-colors",
                             isOwn ? "mr-1" : "ml-1"
                           )}
                         >
                           <Trash2 size={10} />
                         </button>
                      )}
                      <div className={cn(
                        "p-4 shadow-sm border text-sm message-bubble",
                        isOwn 
                          ? "bg-editorial-text text-white border-editorial-text" 
                          : "bg-white text-editorial-text border-editorial-border"
                      )}>
                        {m.text}
                      </div>
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-30 italic">
                          {m.createdAt ? format(m.createdAt.toDate(), 'HH:mm', { locale: nl }) : '...'}
                        </span>
                        {isOwn && <Check size={10} className="text-editorial-accent opacity-50" />}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-6 bg-editorial-bg/30 border-t border-editorial-border flex gap-4 items-center">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Typ een bericht..."
                className="flex-1 bg-white border border-editorial-border px-6 py-4 rounded-none text-sm focus:outline-none focus:placeholder-transparent focus:border-editorial-accent transition-all shadow-inner"
              />
              <button 
                type="submit"
                className="bg-editorial-accent text-white p-4 hover:bg-neutral-800 transition-all shadow-xl disabled:opacity-50"
                disabled={!newMessage.trim()}
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-30">
             <MessageSquare size={80} className="mb-6 text-editorial-accent" />
             <h2 className="text-3xl font-serif italic mb-4">Mijn Berichten</h2>
             <p className="max-w-md font-serif italic text-lg leading-relaxed">
               Selecteer een lezer uit de lijst aan de linkerkant om een gesprek te starten of te hervatten.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
