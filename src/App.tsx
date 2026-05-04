import React, { useState, useEffect, useMemo } from 'react';
import { Library, Plus, BarChart3, Settings, Search, Grid2X2, List, BookMarked, LogOut, Moon, Sun, User as UserIcon, Users, ChevronRight, TrendingUp, BookOpen, Filter, MessageSquare, Globe, Shield, ShieldAlert } from 'lucide-react';
import { auth, db, googleProvider } from './lib/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged, 
  User,
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { bookService, Book } from './services/bookService';
import AddBookModal from './components/Library/AddBookModal';
import BookDetail from './components/Library/BookDetail';
import Stats from './components/Dashboard/Stats';
import ProfileView from './components/Profile/ProfileView';
import SocialFeed from './components/Social/SocialFeed';
import UserProfileDetail from './components/Social/UserProfileDetail';
import Messages from './components/Social/Messages';
import AdminDashboard from './components/Admin/AdminDashboard';
import { UserProfile, userService } from './services/userService';

// Types
type ViewMode = 'grid' | 'list' | 'series' | 'authors' | 'genres' | 'stats' | 'settings' | 'profile' | 'feed' | 'user-profile' | 'messages' | 'admin';

// Helper for sorting authors by last name
function getSortableName(name: string) {
  const parts = name.trim().split(' ');
  return parts[parts.length - 1].toLowerCase();
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Check if it's first time or we want default to be feed
    const saved = localStorage.getItem('library_vault_last_view');
    return (saved as ViewMode) || 'feed';
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSocialUser, setSelectedSocialUser] = useState<UserProfile | null>(null);
  const [chatWithUser, setChatWithUser] = useState<UserProfile | undefined>(undefined);
  const [coverWidth, setCoverWidth] = useState(() => {
    const saved = localStorage.getItem('library_vault_cover_width');
    return saved ? parseInt(saved, 10) : 180;
  });
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    localStorage.setItem('library_vault_cover_width', coverWidth.toString());
  }, [coverWidth]);

  useEffect(() => {
    localStorage.setItem('library_vault_last_view', viewMode);
  }, [viewMode]);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Realtime sync user profile
        const userRef = doc(db, 'users', user.uid);
        
        // Initial setup if doesn't exist
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Gebruiker',
            photoURL: user.photoURL || '',
            theme: 'light',
            uid: user.uid
          });
        }
        
        // Listen for changes
        profileUnsubscribe = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserProfile({ uid: snap.id, ...snap.data() } as UserProfile);
          }
        });
        
        fetchBooks();
      } else {
        setUserProfile(null);
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const fetchBooks = async () => {
    const fetchedBooks = await bookService.getAllBooks();
    setBooks(fetchedBooks);
    
    // Sync selected book if one is open
    setSelectedBook(prev => {
      if (!prev) return null;
      const updated = fetchedBooks.find(b => b.id === prev.id);
      return updated || prev;
    });
  };

  const handleLogin = async (email: string, password: string, isSignUp: boolean) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let message = 'Er is een fout opgetreden.';
      const errorCode = error.code ? ` (${error.code})` : '';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Onjuiste e-mail of wachtwoord.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'Dit e-mailadres is al in gebruik.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Het wachtwoord is te zwak.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Inloggen met e-mail/wachtwoord is niet ingeschakeld in de Firebase Console.';
      } else {
        message = error.message || 'Fout bij inloggen.';
      }
      setLoginError(`${message}${errorCode}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Auth error:', error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError('Pop-up geblokkeerd door je browser. Sta pop-ups toe voor deze site.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError('Domein niet geautoriseerd in Firebase Console. Voeg ais-dev en ais-pre toe aan Geautoriseerde Domeinen.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('Google Login is niet ingeschakeld in de Firebase Console.');
      } else {
        setLoginError(error.message || 'Fout bij inloggen met Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const query = searchQuery.toLowerCase();
    return books.filter(b => 
      b.title.toLowerCase().includes(query) || 
      b.authors.some(a => a.toLowerCase().includes(query)) ||
      (b.series && b.series.toLowerCase().includes(query)) ||
      (b.isbn && b.isbn.includes(query))
    );
  }, [books, searchQuery]);

  // Group by author
  const authorGroups = useMemo(() => {
    const groups: Record<string, Book[]> = {};
    const sourceBooks = searchQuery.trim() ? filteredBooks : books;
    
    sourceBooks.forEach(b => {
      b.authors.forEach(author => {
        if (!groups[author]) groups[author] = [];
        groups[author].push(b);
      });
    });

    // Sort authors by last name and then alphabetically
    const sortedAuthors = Object.keys(groups).sort((a, b) => {
      const sortA = getSortableName(a);
      const sortB = getSortableName(b);
      if (sortA !== sortB) return sortA.localeCompare(sortB);
      return a.localeCompare(b);
    });
    const sortedGroups: Record<string, Book[]> = {};
    sortedAuthors.forEach(author => {
      sortedGroups[author] = groups[author].sort((a, b) => a.title.localeCompare(b.title));
    });
    return sortedGroups;
  }, [books, filteredBooks, searchQuery]);

  // Group by series for series view
  const seriesGroups = useMemo(() => {
    const groups: Record<string, Book[]> = {};
    books.forEach(b => {
      if (b.series) {
        if (!groups[b.series]) groups[b.series] = [];
        groups[b.series].push(b);
      }
    });
    // Sort books within series by index
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (a.seriesIndex || 0) - (b.seriesIndex || 0));
    });
    return groups;
  }, [books]);

  // Group by genre for genre view
  const genreGroups = useMemo(() => {
    const groups: Record<string, Book[]> = {};
    const sourceBooks = searchQuery.trim() ? filteredBooks : books;

    sourceBooks.forEach(b => {
      // Use the first genre as primary group, or 'Onbekend' if empty
      const primaryGenre = b.genre && b.genre.length > 0 ? b.genre[0] : 'Onoverzicht';
      if (!groups[primaryGenre]) groups[primaryGenre] = [];
      groups[primaryGenre].push(b);
    });

    // Sort books within each genre
    Object.keys(groups).forEach(genre => {
      groups[genre].sort((a, b) => {
        // 1. Sort by Author
        const authorA = a.authors[0] || '';
        const authorB = b.authors[0] || '';
        const sortA = getSortableName(authorA);
        const sortB = getSortableName(authorB);

        if (sortA !== sortB) return sortA.localeCompare(sortB);
        if (authorA !== authorB) return authorA.localeCompare(authorB);

        // 2. Sort by Series
        const seriesA = a.series || '';
        const seriesB = b.series || '';
        if (seriesA !== seriesB) {
          // Put books with no series at the end for that author? 
          // Usually better to have series grouped together.
          if (!seriesA) return 1;
          if (!seriesB) return -1;
          return seriesA.localeCompare(seriesB);
        }

        // 3. Sort by Series Index or Title
        if (a.series && b.series && a.series === b.series) {
          return (a.seriesIndex || 0) - (b.seriesIndex || 0);
        }
        return a.title.localeCompare(b.title);
      });
    });

    // Sort the genres themselves alphabetically
    const sortedGroups: Record<string, Book[]> = {};
    Object.keys(groups).sort().forEach(genre => {
      sortedGroups[genre] = groups[genre];
    });

    return sortedGroups;
  }, [books, filteredBooks, searchQuery]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F5F5]">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onAuth={handleLogin} onGoogleAuth={handleGoogleLogin} error={loginError} isLoggingIn={isLoggingIn} />;
  }

  return (
    <div className={cn("min-h-screen flex transition-colors duration-300 font-sans", isDarkMode ? "bg-zinc-950 text-white" : "bg-editorial-bg text-editorial-text")}>
      <AnimatePresence>
        {isAddModalOpen && (
          <AddBookModal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)} 
            onBookAdded={fetchBooks}
          />
        )}
        {selectedBook && (
          <BookDetail 
            book={selectedBook} 
            onClose={() => setSelectedBook(null)}
            onUpdate={fetchBooks}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <nav className={cn(
        "w-64 border-r fixed h-full flex flex-col z-20 py-8 px-6",
        isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-editorial-bg border-editorial-border"
      )}>
        <div className="mb-6">
          <h1 className="text-2xl font-serif italic tracking-tight flex items-center gap-2 text-editorial-accent">
            <div className="w-2 h-8 bg-editorial-accent"></div>
            LibraryVault
          </h1>
        </div>

        <div className="flex-1 space-y-4">
          <section>
            <p className="text-[10px] uppercase tracking-widest text-black/40 font-bold mb-2 italic">Sociaal</p>
            <div className="space-y-0.5">
              <NavItem 
                icon={<Globe size={16} />} 
                label="Overzicht" 
                active={viewMode === 'feed'} 
                onClick={() => setViewMode('feed')} 
              />
              <NavItem 
                icon={<MessageSquare size={16} />} 
                label="Berichten" 
                active={viewMode === 'messages'} 
                onClick={() => setViewMode('messages')} 
              />
            </div>
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-widest text-black/40 font-bold mb-2 italic">Collectie</p>
            <div className="space-y-0.5">
              <NavItem 
                icon={<Grid2X2 size={16} />} 
                label="Bibliotheek" 
                active={viewMode === 'grid' || viewMode === 'list'} 
                onClick={() => setViewMode('grid')} 
              />
              <NavItem 
                icon={<BookMarked size={16} />} 
                label="Series Wall" 
                active={viewMode === 'series'} 
                onClick={() => setViewMode('series')} 
              />
              <NavItem 
                icon={<Users size={16} />} 
                label="Auteurs" 
                active={viewMode === 'authors'} 
                onClick={() => setViewMode('authors')} 
              />
              <NavItem 
                icon={<Filter size={16} />} 
                label="Genres" 
                active={viewMode === 'genres'} 
                onClick={() => setViewMode('genres')} 
              />
              <NavItem 
                icon={<BarChart3 size={16} />} 
                label="Statistieken" 
                active={viewMode === 'stats'} 
                onClick={() => setViewMode('stats')} 
              />
            </div>
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-widest text-black/40 font-bold mb-2 italic">Systeem</p>
            <div className="space-y-0.5">
              <NavItem 
                icon={<UserIcon size={16} />} 
                label="Mijn Profiel" 
                active={viewMode === 'profile'} 
                onClick={() => setViewMode('profile')} 
              />
              <NavItem 
                icon={<Settings size={16} />} 
                label="Instellingen" 
                active={viewMode === 'settings'} 
                onClick={() => setViewMode('settings')} 
              />
              {userService.isAdmin(user?.email) && (
                <NavItem 
                  icon={<Shield size={16} />} 
                  label="Administrator" 
                  active={viewMode === 'admin'} 
                  onClick={() => setViewMode('admin')} 
                />
              )}
            </div>
          </section>
        </div>

        <div className="mt-auto pt-4 border-t border-editorial-border">
          <div className="flex items-center gap-3 mb-4 group cursor-pointer" onClick={() => setViewMode('profile')}>
            <img 
              src={(userProfile?.photoURL || user.photoURL) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              alt="Avatar" 
              className="w-8 h-8 rounded-none border border-editorial-border group-hover:border-editorial-accent transition-colors object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate uppercase tracking-wider group-hover:text-editorial-accent transition-colors">
                {userProfile?.displayName || user.displayName}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1 hover:text-editorial-accent transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full bg-editorial-text text-white py-3 rounded-none text-[10px] uppercase tracking-[0.2em] font-bold shadow-sm hover:bg-neutral-800 transition-colors"
          >
            + Nieuw Boek
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-20 border-b border-editorial-border flex items-center justify-between px-6 md:px-10 bg-white/30 backdrop-blur-md sticky top-0 z-10 gap-6">
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex border border-editorial-border divide-x divide-editorial-border">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("px-4 py-1.5 transition-colors", viewMode === 'grid' ? "bg-editorial-text text-white" : "hover:bg-black/5")}
                title="Grid"
              >
                <Grid2X2 size={14} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("px-4 py-1.5 transition-colors", viewMode === 'list' ? "bg-editorial-text text-white" : "hover:bg-black/5")}
                title="Lijst"
              >
                <List size={14} />
              </button>
              <button 
                onClick={() => setViewMode('series')}
                className={cn("px-4 py-1.5 transition-colors", viewMode === 'series' ? "bg-editorial-text text-white" : "hover:bg-black/5")}
                title="Series Wall"
              >
                <BookMarked size={14} />
              </button>
              <button 
                onClick={() => setViewMode('authors')}
                className={cn("px-4 py-1.5 transition-colors", viewMode === 'authors' ? "bg-editorial-text text-white" : "hover:bg-black/5")}
                title="Auteurs"
              >
                <Users size={14} />
              </button>
              <button 
                onClick={() => setViewMode('genres')}
                className={cn("px-4 py-1.5 transition-colors", viewMode === 'genres' ? "bg-editorial-text text-white" : "hover:bg-black/5")}
                title="Genres"
              >
                <Filter size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center min-w-0">
            <Search className="text-editorial-text/30 mr-3 flex-shrink-0" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek..." 
              className={cn(
                "bg-transparent border-none text-sm w-full max-w-[240px] focus:outline-none focus:ring-0 placeholder-black/30 font-medium"
              )}
            />
          </div>

          <div className="flex items-center gap-4 md:gap-8 flex-shrink-0">
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">Totaal:</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{books.length}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-10">
          {viewMode === 'feed' ? (
            <SocialFeed 
              onSelectUser={(u) => {
                setSelectedSocialUser(u);
                setViewMode('user-profile');
              }} 
              onSelectChat={(u) => {
                setChatWithUser(u);
                setViewMode('messages');
              }}
            />
          ) : viewMode === 'user-profile' && selectedSocialUser ? (
            <UserProfileDetail 
              user={selectedSocialUser} 
              onBack={() => setViewMode('feed')} 
              onChat={(u) => {
                setChatWithUser(u);
                setViewMode('messages');
              }}
            />
          ) : viewMode === 'messages' ? (
            <Messages 
              initialChatUser={chatWithUser} 
              onBack={() => setViewMode('feed')} 
            />
          ) : viewMode === 'stats' ? (
            <Stats books={books} />
          ) : viewMode === 'profile' ? (
            <ProfileView user={user} books={books} />
          ) : viewMode === 'admin' ? (
            <AdminDashboard />
          ) : viewMode === 'settings' ? (
            <SettingsView 
              isDarkMode={isDarkMode} 
              setIsDarkMode={setIsDarkMode} 
              coverWidth={coverWidth} 
              setCoverWidth={setCoverWidth} 
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-baseline gap-4">
                  <h2 className="text-3xl md:text-5xl font-serif font-black tracking-tighter">
                    {viewMode === 'grid' && "Collectie"}
                    {viewMode === 'list' && "Lijst Weergave"}
                    {viewMode === 'series' && "Series Wall"}
                    {viewMode === 'authors' && "Overzicht Auteurs"}
                    {viewMode === 'genres' && "Overzicht Genres"}
                    {viewMode === 'profile' && "Mijn Profiel"}
                  </h2>
                  {searchQuery && (
                    <span className="text-lg font-serif italic text-black/40 hidden md:inline">voor "{searchQuery}"</span>
                  )}
                </div>
              </div>

              <div className="grid gap-8">
                {filteredBooks.length === 0 ? (
                  <div className="h-96 flex flex-col items-center justify-center border border-editorial-border rounded-none text-zinc-300">
                    <BookOpen size={48} className="mb-4 opacity-5" />
                    <p className="font-serif italic text-xl mb-1 text-black/40">Niets gevonden</p>
                  </div>
                ) : viewMode === 'series' ? (
                  <div className="space-y-16">
                     {(Object.entries(seriesGroups) as [string, Book[]][]).map(([name, seriesBooks]) => (
                       <div key={name} className="space-y-6">
                          <div className="flex items-baseline gap-4 border-b border-editorial-border pb-2">
                            <h2 className="text-3xl font-serif font-bold tracking-tight">{name}</h2>
                            <span className="text-black/40 font-serif italic text-sm">{seriesBooks.length} delen</span>
                          </div>
                          <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide">
                             {seriesBooks.map(book => (
                               <div key={book.id} style={{ minWidth: coverWidth, maxWidth: coverWidth }}>
                                 <BookItem book={book} mode="grid" onClick={() => setSelectedBook(book)} coverWidth={coverWidth} />
                               </div>
                             ))}
                          </div>
                       </div>
                     ))}
                  </div>
                ) : viewMode === 'authors' ? (
                  <div className="space-y-16">
                     {(Object.entries(authorGroups) as [string, Book[]][]).map(([name, authorBooks]) => (
                       <div key={name} className="space-y-6">
                          <div className="flex items-baseline gap-4 border-b border-editorial-border pb-2">
                            <h2 className="text-3xl font-serif font-bold tracking-tight">{name}</h2>
                            <span className="text-black/40 font-serif italic text-sm">{authorBooks.length} boeken</span>
                          </div>
                          <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide">
                             {authorBooks.map(book => (
                               <div key={book.id} style={{ minWidth: coverWidth, maxWidth: coverWidth }}>
                                 <BookItem book={book} mode="grid" onClick={() => setSelectedBook(book)} coverWidth={coverWidth} />
                               </div>
                             ))}
                          </div>
                       </div>
                     ))}
                  </div>
                ) : viewMode === 'genres' ? (
                  <div className="space-y-16">
                     {(Object.entries(genreGroups) as [string, Book[]][]).map(([name, genreBooks]) => (
                       <div key={name} className="space-y-6">
                          <div className="flex items-baseline gap-4 border-b border-editorial-border pb-2">
                            <h2 className="text-3xl font-serif font-bold tracking-tight">{name}</h2>
                            <span className="text-black/40 font-serif italic text-sm">{genreBooks.length} boeken</span>
                          </div>
                          <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide">
                             {genreBooks.map(book => (
                               <div key={book.id} style={{ minWidth: coverWidth, maxWidth: coverWidth }}>
                                 <BookItem book={book} mode="grid" onClick={() => setSelectedBook(book)} coverWidth={coverWidth} />
                               </div>
                             ))}
                          </div>
                       </div>
                     ))}
                  </div>
                ) : (
                  <div 
                    className={cn(
                      viewMode === 'grid' ? "grid gap-x-10 gap-y-12" : "flex flex-col border-t border-editorial-border"
                    )}
                    style={viewMode === 'grid' ? { 
                      gridTemplateColumns: `repeat(auto-fill, ${coverWidth}px)` 
                    } : {}}
                  >
                    {filteredBooks.map(book => (
                      <div key={book.id} style={viewMode === 'grid' ? { width: coverWidth } : {}}>
                        <BookItem 
                          book={book} 
                          mode={viewMode as 'grid'|'list'} 
                          onClick={() => setSelectedBook(book)}
                          coverWidth={coverWidth}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <footer className="h-12 border-t border-editorial-border bg-white flex items-center justify-between px-10 text-[10px] font-bold uppercase tracking-[0.15em] text-black/40">
           <div className="flex gap-10">
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-editorial-accent"></div> {books.length} Boeken</span>
              <span>{books.filter(b => b.readingStatus === 'Gelezen').length} Gelezen</span>
           </div>
           <div className="flex gap-6">
             <span className="text-editorial-accent">Status: Online</span>
             <span>MEI 2026</span>
           </div>
        </footer>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-0 py-1.5 transition-all duration-200 group text-left",
        active ? "text-editorial-accent" : "text-black/50 hover:text-black"
      )}
    >
      <span className={cn("transition-all duration-300 text-[10px]", active ? "opacity-100" : "opacity-0 group-hover:opacity-40")}>
        ●
      </span>
      <span className={cn("text-sm font-medium", active ? "font-bold" : "")}>{label}</span>
      {active && (
        <motion.div 
          layoutId="sidebar-dot"
          className="ml-auto w-1 h-1 bg-editorial-accent rounded-full"
        />
      )}
    </button>
  );
}

function ViewToggle({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all duration-200",
        active ? "bg-editorial-text text-white" : "text-black/40 hover:text-black"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function BookItem({ book, mode, onClick, coverWidth }: { book: Book, mode: 'grid' | 'list', onClick: () => void, coverWidth?: number, key?: React.Key }) {
  if (mode === 'list') {
    return (
      <div 
        onClick={onClick}
        className="py-6 border-b border-editorial-border flex items-center gap-8 hover:bg-neutral-50/50 transition-all group cursor-pointer px-4"
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm uppercase tracking-tight group-hover:text-editorial-accent transition-colors">{book.title}</h4>
          <p className="text-xs italic text-black/50 mt-1">{book.authors.join(', ')}</p>
        </div>
        
        <div className="flex items-center gap-12 text-[10px] font-bold uppercase tracking-widest text-black/40">
          <span className="w-24 truncate italic opacity-60">{book.genre[0] || '-'}</span>
          <span className="w-40">{book.series ? `${book.series} #${book.seriesIndex}` : '-'}</span>
          <div className="w-24 flex text-editorial-accent">
             {'★'.repeat(Math.round(book.rating || 0)) + '☆'.repeat(5 - Math.round(book.rating || 0))}
          </div>
          <span className={cn(
            "px-3 py-1 border border-current text-[9px] min-w-[80px] text-center",
            book.readingStatus === 'Gelezen' ? "text-green-700 bg-green-50/50" :
            book.readingStatus === 'Bezig' ? "text-blue-700 bg-blue-50/50" :
            book.readingStatus === 'Wil ik lezen' ? "text-orange-700 bg-orange-50/50" :
            "text-black/30"
          )}>
            {book.readingStatus}
          </span>
        </div>
        
        <ChevronRight size={14} className="text-black/10 group-hover:text-black transition-all" />
      </div>
    );
  }

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="aspect-[2/3] overflow-hidden shadow-xl border border-black/10 relative mb-5 bg-[#d9d5ce] transition-all duration-500 group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center font-serif italic text-black/20">
             <span className="text-7xl mb-2 opacity-50">{book.title.substring(0, 1)}</span>
             <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] line-clamp-3 px-4">{book.title}</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
           <p className="text-white text-[10px] font-bold uppercase tracking-widest mb-1">{book.readingStatus}</p>
           <div className="h-1 bg-editorial-accent w-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                whileHover={{ width: '100%' }}
                className="h-full bg-white transition-all duration-500"
              />
           </div>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm uppercase leading-tight group-hover:text-editorial-accent transition-colors">{book.title}</h3>
        <p className="text-xs italic text-black/60 mt-1">{book.authors.join(', ')}</p>
        
        {book.series && (
          <p className="text-[10px] uppercase font-bold tracking-widest text-black/40 mt-1.5 flex items-center gap-1.5">
            <BookMarked size={10} className="text-editorial-accent" />
            {book.series} <span className="text-editorial-accent">#{book.seriesIndex}</span>
          </p>
        )}

        <div className="mt-2 flex text-editorial-accent text-[10px]">
           {'★'.repeat(Math.round(book.rating || 0))}
        </div>
      </div>
    </motion.div>
  );
}

function SettingsView({ 
  isDarkMode, 
  setIsDarkMode, 
  coverWidth, 
  setCoverWidth 
}: { 
  isDarkMode: boolean, 
  setIsDarkMode: (v: boolean) => void,
  coverWidth: number,
  setCoverWidth: (v: number) => void
}) {
  return (
    <div className="max-w-4xl space-y-12">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-12">
          <section className="space-y-6">
            <h3 className="text-xl font-serif italic font-bold border-b border-editorial-border pb-2 text-editorial-accent">Interface</h3>
            <div className="flex items-center justify-between">
               <div>
                 <p className="font-bold uppercase text-xs tracking-widest">Donkere Modus</p>
                 <p className="text-xs italic text-black/40">Voor nachtelijk lezen</p>
               </div>
               <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={cn(
                  "w-12 h-6 border border-editorial-border p-1 transition-colors duration-300",
                  isDarkMode ? "bg-black" : "bg-transparent"
                )}
               >
                 <div className={cn(
                   "w-4 h-4 transition-transform duration-300",
                   isDarkMode ? "translate-x-6 bg-white" : "translate-x-0 bg-black"
                 )} />
               </button>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-serif italic font-bold border-b border-editorial-border pb-2 text-editorial-accent">Weergave</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <p className="font-bold uppercase text-xs tracking-widest">Grootte Boekomslag</p>
                  <span className="text-xs font-mono text-black/40">{coverWidth}px</span>
                </div>
                <input 
                  type="range" 
                  min="120" 
                  max="320" 
                  step="10"
                  value={coverWidth}
                  onChange={(e) => setCoverWidth(parseInt(e.target.value))}
                  className="w-full h-1 bg-editorial-border rounded-none appearance-none cursor-pointer accent-editorial-accent"
                />
                <div className="flex justify-between mt-1 text-[8px] font-bold uppercase tracking-widest text-black/30 italic">
                  <span>S</span>
                  <span>M</span>
                  <span>L</span>
                  <span>XL</span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-serif italic font-bold border-b border-editorial-border pb-2 text-editorial-accent">Bibliotheek Data</h3>
            <div className="space-y-2">
               <SettingsButton label="Exporteer Bibliotheek (JSON)" />
               <SettingsButton label="Exporteer als CSV" />
            </div>
          </section>
        </div>

        <div className="flex flex-col items-center justify-start pt-12 space-y-4 bg-black/[0.02] border border-editorial-border p-8">
           <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-4 italic">Voorbeeld Weergave</p>
           <div className="relative group" style={{ width: coverWidth }}>
             <div className="aspect-[2/3] overflow-hidden shadow-2xl border border-black/10 bg-[#d9d5ce]">
               <img 
                 src="https://images.unsplash.com/photo-1543005814-14b24e82ff3e?q=80&w=800&auto=format&fit=crop" 
                 alt="Preview" 
                 className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex flex-col justify-end">
                 <div className="h-1 bg-editorial-accent w-full"></div>
               </div>
             </div>
             <div className="mt-4 text-center">
               <h4 className="font-bold text-xs uppercase tracking-tight">Titel van het Boek</h4>
               <p className="text-[10px] italic text-black/50">Auteur Naam</p>
             </div>
           </div>
           <p className="text-[10px] italic text-black/30 mt-8 text-center max-w-[200px]">
             Pas de schuifbalk aan om de ideale grootte voor jouw collectie te vinden.
           </p>
        </div>
      </section>
    </div>
  );
}

function SettingsButton({ label }: { label: string }) {
  return (
    <button className="w-full flex items-center justify-between py-4 border-b border-editorial-border hover:bg-black/5 transition-colors px-2 text-left group">
       <span className="font-bold text-xs uppercase tracking-widest italic group-hover:text-editorial-accent">{label}</span>
       <ChevronRight size={14} className="text-black/20 group-hover:text-black" />
    </button>
  );
}

function LoginView({ onAuth, onGoogleAuth, error, isLoggingIn }: { onAuth: (email: string, password: string, isSignUp: boolean) => void, onGoogleAuth: () => void, error: string | null, isLoggingIn: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    onAuth(email, password, isSignUp);
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-editorial-bg overflow-hidden relative font-sans">
      <div className="absolute inset-0 z-0">
         <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/felt.png")` }}></div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center w-full max-w-md px-10 border border-editorial-border py-16 bg-white shadow-2xl"
      >
        <div className="w-16 h-16 bg-editorial-accent flex items-center justify-center text-white mx-auto mb-8 shadow-lg">
          <Library size={28} />
        </div>
        
        <h1 className="text-5xl font-serif font-black tracking-tighter text-editorial-text mb-4 leading-none italic">
          LibraryVault
        </h1>
        
        <p className="text-editorial-text/60 mb-10 text-sm font-serif italic max-w-xs mx-auto">
          {isSignUp ? "Maak een account aan voor je bibliotheek." : "Toegang tot je persoonlijke digitale bibliotheek."}
        </p>
        
        <div className="space-y-4 mb-8">
          <button 
            type="button"
            onClick={onGoogleAuth}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-editorial-border hover:bg-neutral-50 transition-colors rounded-none font-bold text-[10px] uppercase tracking-widest disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 1.2-4.53z" />
            </svg>
            Inloggen met Google
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-editorial-border"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-white px-4 text-black/30 font-bold italic">of</span></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 italic px-1">E-mailadres</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-none border border-editorial-border focus:outline-none focus:border-editorial-text bg-white text-sm"
              placeholder="naam@voorbeeld.nl"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 italic px-1">Wachtwoord</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-none border border-editorial-border focus:outline-none focus:border-editorial-text bg-white text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-[10px] font-bold uppercase tracking-widest italic text-center pt-2"
            >
              {error}
            </motion.p>
          )}

          <button 
            disabled={isLoggingIn}
            type="submit"
            className="w-full bg-editorial-text text-white py-4 rounded-none font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-neutral-800 transition-all disabled:bg-neutral-400 mt-6 flex items-center justify-center gap-3"
          >
            {isLoggingIn && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            {isLoggingIn ? "Bezig..." : (isSignUp ? "Registreren" : "Inloggen")}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-editorial-border">
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
            }}
            className="text-[10px] font-bold uppercase tracking-widest text-editorial-accent hover:underline italic"
          >
            {isSignUp ? "Heb je al een account? Log in" : "Nog geen account? Registreer hier"}
          </button>
        </div>
      </motion.div>
      
      <div className="absolute bottom-10 left-0 w-full flex items-center justify-center gap-16 opacity-30 pointer-events-none">
         <div className="flex flex-col items-center gap-2">
           <TrendingUp size={16}/>
           <span className="text-[9px] font-bold uppercase tracking-widest italic">Metadata</span>
         </div>
         <div className="flex flex-col items-center gap-2">
           <Grid2X2 size={16}/>
           <span className="text-[9px] font-bold uppercase tracking-widest italic">Views</span>
         </div>
         <div className="flex flex-col items-center gap-2">
           <BookOpen size={16}/>
           <span className="text-[9px] font-bold uppercase tracking-widest italic">Sync</span>
         </div>
      </div>
    </div>
  );
}

