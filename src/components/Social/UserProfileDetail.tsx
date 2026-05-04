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

interface UserProfileDetailProps {
  user: UserProfile;
  onBack: () => void;
  onChat: (user: UserProfile) => void;
}

export default function UserProfileDetail({ user, onBack, onChat }: UserProfileDetailProps) {
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
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] hover:text-editorial-accent transition-colors mb-4"
      >
        <ChevronLeft size={16} /> Terug naar Feed
      </button>

      {/* Header */}
      <div className="relative">
        <div className="h-64 bg-editorial-accent/5 border border-editorial-border overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
        </div>
        
        <div className="px-12 -mt-16 relative z-10 flex flex-col md:flex-row items-end gap-8 justify-between">
          <div className="flex flex-col md:flex-row items-end gap-8">
            <div className="relative group">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                alt={user.displayName}
                className="w-40 h-40 rounded-none border-4 border-white shadow-2xl object-cover bg-white"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mb-4">
              <h1 className="text-5xl font-serif font-black tracking-tight italic leading-none mb-4">{user.displayName}</h1>
              <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-black/40">
                <span className="flex items-center gap-2"><MapPin size={12} /> {user.city || 'Onbekend'}, {user.country || 'Nederland'}</span>
                <span className="flex items-center gap-2"><Globe size={12} /> {followerCount} Volgers</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-4">
             <button 
               onClick={handleFollowToggle}
               className={cn(
                 "px-8 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2",
                 isFollowing 
                   ? "bg-white border-editorial-border text-black/40 hover:text-red-500 hover:border-red-500" 
                   : "bg-editorial-accent border-editorial-accent text-white hover:bg-neutral-800"
               )}
             >
               {isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
               {isFollowing ? 'Ontvolgen' : 'Volgen'}
             </button>
             {isFollowing && (
               <button 
                 onClick={() => onChat(user)}
                 className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest border border-editorial-text text-editorial-text hover:bg-editorial-text hover:text-white transition-all flex items-center gap-2"
               >
                 <MessageCircle size={14} /> Bericht
               </button>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
         {/* Bio / Stats */}
         <div className="col-span-12 lg:col-span-4 space-y-10">
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-editorial-accent border-b border-editorial-border pb-2 italic">Achtergrond</h3>
              <div className="bg-white border border-editorial-border p-8 text-sm font-serif italic text-black/60 leading-relaxed">
                Op de bibliotheek van {user.displayName} staan momenteel {books.length} titels gearchiveerd.
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-editorial-accent border-b border-editorial-border pb-2 italic">Statistiek</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-editorial-bg border border-editorial-border p-6 text-center">
                   <span className="block text-2xl font-serif font-black">{books.length}</span>
                   <span className="text-[9px] uppercase font-bold tracking-widest opacity-40">Boeken</span>
                </div>
                <div className="bg-editorial-bg border border-editorial-border p-6 text-center">
                   <span className="block text-2xl font-serif font-black">{books.filter(b => b.readingStatus === 'Gelezen').length}</span>
                   <span className="text-[9px] uppercase font-bold tracking-widest opacity-40">Uitlezen</span>
                </div>
              </div>
            </section>
         </div>

         {/* Collection */}
         <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between border-b border-editorial-border pb-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-editorial-accent italic">Publieke Collectie</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn("p-2 transition-colors", viewMode === 'grid' ? "text-editorial-accent" : "text-black/20")}
                >
                  <Grid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn("p-2 transition-colors", viewMode === 'list' ? "text-editorial-accent" : "text-black/20")}
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
                      <div className="aspect-[2/3] bg-neutral-100 border border-editorial-border overflow-hidden relative shadow-lg group-hover:border-editorial-accent transition-all duration-500">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center grayscale opacity-20">
                             <span className="text-[8px] font-bold uppercase tracking-[0.3em]">{book.title}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-editorial-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <span className="bg-white px-4 py-2 text-[9px] font-bold uppercase tracking-widest shadow-xl">Bekijk Details</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase truncate tracking-widest group-hover:text-editorial-accent transition-colors">{book.title}</p>
                        <p className="text-[9px] font-serif italic text-black/40 truncate">{book.authors.join(', ')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6 p-4 border border-editorial-border hover:border-editorial-accent transition-all bg-white">
                      <img src={book.coverUrl} className="w-12 h-16 object-cover" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest">{book.title}</p>
                        <p className="text-[10px] font-serif italic text-black/40">{book.authors.join(', ')}</p>
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
         />
      )}
    </div>
  );
}
