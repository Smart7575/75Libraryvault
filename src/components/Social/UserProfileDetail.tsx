import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Book as BookIcon, 
  Calendar, 
  MapPin, 
  UserPlus, 
  UserMinus,
  MessageCircle,
  Globe,
  Grid,
  List as ListIcon
} from 'lucide-react';
import { UserProfile, userService } from '../../services/userService';
import { Book, bookService } from '../../services/bookService';
import { socialService } from '../../services/socialService';
import { auth } from '../../lib/firebase';
import BookDetail from '../Library/BookDetail';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../lib/LanguageContext';
import { translateStatus } from '../../translations';

interface UserProfileDetailProps {
  user: UserProfile;
  onBack: () => void;
  onChat: (user: UserProfile) => void;
  isDarkMode?: boolean;
}

export default function UserProfileDetail({ user, onBack, onChat, isDarkMode }: UserProfileDetailProps) {
  const { t, language } = useLanguage();
  const [books, setBooks] = useState<Book[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [followerCount, setFollowerCount] = useState(user.followerCount || 0);

  useEffect(() => {
    // Fetch user's books
    bookService.getBooksByUserId(user.uid).then(setBooks);
    
    // Check following status
    if (auth.currentUser) {
      socialService.isFollowing(auth.currentUser.uid, user.uid).then(setIsFollowing);
    }

    // Dynamic counts
    socialService.getFollowCounts(user.uid).then(c => setFollowerCount(c.followers));
  }, [user.uid]);

  const handleFollowToggle = async () => {
    if (!auth.currentUser) return;
    try {
      if (isFollowing) {
        await socialService.unfollowUser(auth.currentUser.uid, user.uid);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await socialService.followUser(auth.currentUser.uid, user.uid);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <button 
        onClick={onBack}
        className={cn(
          "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] transition-colors mb-4",
          isDarkMode ? "text-white/40 hover:text-editorial-accent-bright" : "text-black/40 hover:text-editorial-accent"
        )}
      >
        <ChevronLeft size={16} /> {t('social.backToFeed')}
      </button>

      {/* Header */}
      <div className="relative">
        <div className={cn(
          "h-64 border overflow-hidden relative",
          isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-editorial-accent/5 border-editorial-border"
        )}>
          <div className={cn("absolute inset-0 opacity-10", isDarkMode ? "bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" : "bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]")}></div>
        </div>
        
        <div className="px-12 -mt-16 relative z-10 flex flex-col md:flex-row items-end gap-8 justify-between">
          <div className="flex flex-col md:flex-row items-end gap-8 text-center md:text-left">
            <div className="relative group mx-auto md:mx-0">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                alt={user.displayName}
                className={cn("w-40 h-40 rounded-none border-4 shadow-2xl object-cover", isDarkMode ? "border-zinc-800 bg-zinc-900" : "border-white bg-white")}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mb-4">
              <h1 className="text-5xl font-serif font-black tracking-tight italic leading-none mb-4">{user.displayName}</h1>
              <div className={cn("flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-white/60" : "text-black/40")}>
                <span className="flex items-center gap-2"><MapPin size={12} /> {user.city || t('common.unknown')}, {user.country || (language === 'nl' ? 'Nederland' : 'Netherlands')}</span>
                <span className="flex items-center gap-2"><Globe size={12} /> {followerCount} {t('social.followers') || 'Volgers'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-4 mx-auto md:mx-0">
             <button 
               onClick={handleFollowToggle}
               className={cn(
                 "px-8 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2",
                 isFollowing 
                   ? (isDarkMode ? "bg-zinc-900 border-zinc-800 text-white/40 hover:text-red-500 hover:border-red-500" : "bg-white border-editorial-border text-black/40 hover:text-red-500 hover:border-red-500")
                   : (isDarkMode ? "bg-white border-white text-zinc-900 hover:bg-neutral-200" : "bg-editorial-accent border-editorial-accent text-white hover:bg-neutral-800")
               )}
             >
               {isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
               {isFollowing ? (t('social.unfollow') || 'Ontvolgen') : (t('social.follow') || 'Volgen')}
             </button>
             {isFollowing && (
               <button 
                 onClick={() => onChat(user)}
                 className={cn(
                    "px-8 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2",
                    isDarkMode ? "border-white text-white hover:bg-white hover:text-zinc-900" : "border-editorial-text text-editorial-text hover:bg-editorial-text hover:text-white"
                 )}
               >
                 <MessageCircle size={14} /> {t('social.message') || 'Bericht'}
               </button>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
         {/* Bio / Stats */}
         <div className="col-span-12 lg:col-span-4 space-y-10">
            <section className="space-y-4">
              <h3 className={cn("text-xs font-bold uppercase tracking-[0.2em] border-b pb-2 italic", isDarkMode ? "text-editorial-accent-bright border-zinc-800" : "text-editorial-accent border-editorial-border")}>{t('social.background')}</h3>
              <div className={cn("border p-8 text-sm font-serif italic leading-relaxed", isDarkMode ? "bg-zinc-900 border-zinc-800 text-white/60" : "bg-white border-editorial-border text-black/60")}>
                {t('social.libraryStatusOf', { name: user.displayName, count: books.length })}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className={cn("text-xs font-bold uppercase tracking-[0.2em] border-b pb-2 italic", isDarkMode ? "text-editorial-accent-bright border-zinc-800" : "text-editorial-accent border-editorial-border")}>{t('social.statistics')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className={cn("border p-6 text-center", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-editorial-bg border-editorial-border")}>
                   <span className="block text-2xl font-serif font-black">{books.length}</span>
                   <span className={cn("text-[9px] uppercase font-bold tracking-widest", isDarkMode ? "text-white/40" : "opacity-40")}>{t('library.books')}</span>
                </div>
                <div className={cn("border p-6 text-center", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-editorial-bg border-editorial-border")}>
                   <span className="block text-2xl font-serif font-black">{books.filter(b => b.readingStatus === 'Gelezen').length}</span>
                   <span className={cn("text-[9px] uppercase font-bold tracking-widest", isDarkMode ? "text-white/40" : "opacity-40")}>{t('library.read')}</span>
                </div>
              </div>
            </section>
         </div>

         {/* Collection */}
         <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className={cn("flex items-center justify-between border-b pb-4", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
              <h3 className={cn("text-xs font-bold uppercase tracking-[0.2em] italic", isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent")}>{t('social.publicCollection')}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn("p-2 transition-colors", viewMode === 'grid' ? (isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent") : (isDarkMode ? "text-white/40" : "text-black/20"))}
                >
                  <Grid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn("p-2 transition-colors", viewMode === 'list' ? (isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent") : (isDarkMode ? "text-white/40" : "text-black/20"))}
                >
                  <ListIcon size={18} />
                </button>
              </div>
            </div>

            <div className={cn(
              "grid gap-8",
              viewMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-1"
            )}>
              {books.map((book) => (
                <div 
                  key={book.id} 
                  onClick={() => setSelectedBook(book)}
                  className="group cursor-pointer"
                >
                  {viewMode === 'grid' ? (
                    <div className="space-y-4">
                      <div className={cn("aspect-[2/3] border overflow-hidden relative shadow-lg group-hover:border-editorial-accent transition-all duration-500", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-neutral-100 border-editorial-border")}>
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className={cn("w-full h-full object-cover transition-all duration-700", isDarkMode ? "opacity-70 group-hover:opacity-100" : "grayscale-[0.2] group-hover:grayscale-0")} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center grayscale opacity-20">
                             <span className="text-[8px] font-bold uppercase tracking-[0.3em]">{book.title}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-editorial-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <span className={cn("px-4 py-2 text-[9px] font-bold uppercase tracking-widest shadow-xl", isDarkMode ? "bg-zinc-900 text-white" : "bg-white text-editorial-text")}>{t('social.viewDetails')}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className={cn("text-[10px] font-bold uppercase truncate tracking-widest transition-colors", isDarkMode ? "text-white group-hover:text-editorial-accent-bright" : "text-editorial-text group-hover:text-editorial-accent")}>{book.title}</p>
                        <p className={cn("text-[9px] font-serif italic truncate", isDarkMode ? "text-white/40" : "text-black/40")}>{book.authors.join(', ')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className={cn("flex items-center gap-6 p-4 border hover:border-editorial-accent transition-all", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border")}>
                      {book.coverUrl ? (
                         <img src={book.coverUrl} className={cn("w-12 h-16 object-cover", isDarkMode ? "opacity-90" : "grayscale-0")} />
                      ) : (
                        <div className="w-12 h-16 bg-neutral-100 flex items-center justify-center opacity-20">
                          <BookIcon size={12} />
                        </div>
                      )}
                      <div>
                        <p className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-white font-bold" : "text-editorial-text")}>{book.title}</p>
                        <p className={cn("text-[10px] font-serif italic", isDarkMode ? "text-white/40" : "text-black/40")}>{book.authors.join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
         </div>
      </div>

      {selectedBook && (
         <BookDetail 
           book={{...selectedBook, storageUrl: ''}} // Hide storage URL for others
           onClose={() => setSelectedBook(null)}
           onUpdate={() => setSelectedBook(null)}
           isDarkMode={isDarkMode}
         />
      )}
    </div>
  );
}
