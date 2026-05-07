import React, { useState, useEffect, useMemo } from 'react';
import { Library, Plus, BarChart3, Settings, Search, Grid2X2, List, BookMarked, LogOut, Moon, Sun, User as UserIcon, Users, ChevronRight, TrendingUp, BookOpen, Filter, MessageSquare, Globe, Shield, ShieldAlert, Star } from 'lucide-react';
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
import { useLanguage } from './lib/LanguageContext';
import { Language, translateStatus } from './translations';

// Types
type ViewMode = 'grid' | 'list' | 'series' | 'authors' | 'genres' | 'stats' | 'settings' | 'profile' | 'feed' | 'user-profile' | 'messages' | 'admin';

// Helper for sorting authors by last name
function getSortableName(name: string) {
  const parts = name.trim().split(' ');
  return parts[parts.length - 1].toLowerCase();
}

export default function App() {
  const { t, language, setLanguage } = useLanguage();
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
    let booksUnsubscribe: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Cleanup previous listeners
      if (profileUnsubscribe) profileUnsubscribe();
      if (booksUnsubscribe) booksUnsubscribe();
      
      if (user) {
        // Realtime sync user profile
        const userRef = doc(db, 'users', user.uid);
        
        // Initial setup if doesn't exist
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || (t('common.user') || 'Gebruiker'),
            photoURL: user.photoURL || '',
            theme: 'light',
            uid: user.uid
          });
        }
        
        // Listen for profile changes
        profileUnsubscribe = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserProfile({ uid: snap.id, ...snap.data() } as UserProfile);
          }
        });
        
        // Listen for books changes
        booksUnsubscribe = bookService.onBooksUpdate((updatedBooks) => {
          setBooks(updatedBooks);
          
          // Sync selected book if one is open
          setSelectedBook(prev => {
            if (!prev) return null;
            const updated = updatedBooks.find(b => b.id === prev.id);
            return updated || prev;
          });
        });
      } else {
        setUserProfile(null);
        setBooks([]);
        profileUnsubscribe = null;
        booksUnsubscribe = null;
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
      if (booksUnsubscribe) booksUnsubscribe();
    };
  }, []);

  // fetchBooks is now deprecated in favor of real-time sync, but keeping it for legacy prop compatibility
  const fetchBooks = () => {
    // This is now handled by onSnapshot
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
      let message = t('auth.errorGeneric') || 'Er is een fout opgetreden.';
      const errorCode = error.code ? ` (${error.code})` : '';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = t('auth.errorInvalid') || 'Onjuiste e-mail of wachtwoord.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = t('auth.errorEmailInUse') || 'Dit e-mailadres is al in gebruik.';
      } else if (error.code === 'auth/weak-password') {
        message = t('auth.errorWeakPassword') || 'Het wachtwoord is te zwak.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = t('auth.errorOperationNotAllowed') || 'Inloggen met e-mail/wachtwoord is niet ingeschakeld in de Firebase Console.';
      } else {
        message = error.message || t('auth.errorAuthFailed') || 'Fout bij inloggen.';
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
        setLoginError(t('auth.errorPopupBlocked') || 'Pop-up geblokkeerd door je browser. Sta pop-ups toe voor deze site.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setLoginError(t('auth.errorPopupClosed') || 'Het inlogvenster werd gesloten voordat het inloggen was voltooid.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError('Domein niet geautoriseerd in Firebase Console.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError(t('auth.errorOperationNotAllowed') || 'Google Login is niet ingeschakeld in de Firebase Console.');
      } else {
        setLoginError(error.message || t('auth.errorAuthFailed') || 'Fout bij inloggen met Google.');
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
      // Use the first genre as primary group, or 'Unknown' if empty
      const primaryGenre = b.genre && b.genre.length > 0 ? b.genre[0] : (t('common.unknown') || 'Onbekend');
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
    return <LoginView onAuth={handleLogin} onGoogleAuth={handleGoogleLogin} error={loginError} isLoggingIn={isLoggingIn} isDarkMode={isDarkMode} />;
  }

  return (
    <div className={cn(
      "min-h-screen flex transition-colors duration-300 font-sans selection:bg-editorial-accent/30", 
      isDarkMode && "dark",
      isDarkMode ? "bg-zinc-950 text-neutral-100" : "bg-editorial-bg text-editorial-text"
    )}>
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
            isDarkMode={isDarkMode}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <nav className={cn(
        "w-64 border-r fixed h-full flex flex-col z-20 py-8 px-6",
        isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-editorial-bg border-editorial-border"
      )}>
        <div className="mb-6">
          <h1 className={cn("text-2xl font-serif italic tracking-tight flex items-center gap-2", isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent")}>
            <div className={cn("w-2 h-8", isDarkMode ? "bg-editorial-accent-bright" : "bg-editorial-accent")}></div>
            LibraryVault
          </h1>
        </div>

        <div className="flex-1 space-y-4">
          <section>
            <p className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 font-bold mb-2 italic">{t('social.title') || 'Social'}</p>
            <div className="space-y-0.5">
              <NavItem 
                icon={<Globe size={16} />} 
                label={t('nav.feed') || 'Overzicht'} 
                active={viewMode === 'feed'} 
                onClick={() => setViewMode('feed')} 
                isDarkMode={isDarkMode}
              />
              <NavItem 
                icon={<MessageSquare size={16} />} 
                label={t('nav.messages') || 'Berichten'} 
                active={viewMode === 'messages'} 
                onClick={() => setViewMode('messages')} 
                isDarkMode={isDarkMode}
              />
            </div>
          </section>

          <section>
            <p className={cn("text-[10px] uppercase tracking-widest font-bold mb-2 italic", isDarkMode ? "text-white/40" : "text-black/40")}>{t('nav.collection') || 'Collectie'}</p>
            <div className="space-y-0.5">
              <NavItem 
                icon={<Grid2X2 size={16} />} 
                label={t('nav.library') || 'Bibliotheek'} 
                active={viewMode === 'grid' || viewMode === 'list'} 
                onClick={() => setViewMode('grid')} 
                isDarkMode={isDarkMode}
              />
              <NavItem 
                icon={<BookMarked size={16} />} 
                label={t('nav.seriesWall') || 'Series Wall'} 
                active={viewMode === 'series'} 
                onClick={() => setViewMode('series')} 
                isDarkMode={isDarkMode}
              />
              <NavItem 
                icon={<Users size={16} />} 
                label={t('nav.authors') || 'Auteurs'} 
                active={viewMode === 'authors'} 
                onClick={() => setViewMode('authors')} 
                isDarkMode={isDarkMode}
              />
              <NavItem 
                icon={<Filter size={16} />} 
                label={t('nav.genres') || 'Genres'} 
                active={viewMode === 'genres'} 
                onClick={() => setViewMode('genres')} 
                isDarkMode={isDarkMode}
              />
              <NavItem 
                icon={<BarChart3 size={16} />} 
                label={t('nav.stats') || 'Statistieken'} 
                active={viewMode === 'stats'} 
                onClick={() => setViewMode('stats')} 
                isDarkMode={isDarkMode}
              />
            </div>
          </section>

          <section>
            <p className={cn("text-[10px] uppercase tracking-widest font-bold mb-2 italic", isDarkMode ? "text-white/40" : "text-black/40")}>{t('nav.system') || 'Systeem'}</p>
            <div className="space-y-0.5">
              <NavItem 
                icon={<UserIcon size={16} />} 
                label={t('nav.profile') || 'Mijn Profiel'} 
                active={viewMode === 'profile'} 
                onClick={() => setViewMode('profile')} 
                isDarkMode={isDarkMode}
              />
              <NavItem 
                icon={<Settings size={16} />} 
                label={t('nav.settings') || 'Instellingen'} 
                active={viewMode === 'settings'} 
                onClick={() => setViewMode('settings')} 
                isDarkMode={isDarkMode}
              />
              {userService.isAdmin(user?.email) && (
                <NavItem 
                  icon={<Shield size={16} />} 
                  label={t('nav.admin') || 'Administrator'} 
                  active={viewMode === 'admin'} 
                  onClick={() => setViewMode('admin')} 
                  isDarkMode={isDarkMode}
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
            {t('library.addBook') || '+ Nieuw Boek'}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className={cn(
          "h-20 border-b flex items-center justify-between px-6 md:px-10 backdrop-blur-md sticky top-0 z-10 gap-6 transition-colors",
          isDarkMode ? "bg-zinc-950/70 border-zinc-800" : "bg-white/70 border-editorial-border"
        )}>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className={cn(
              "flex border divide-x",
              isDarkMode ? "border-zinc-800 divide-zinc-800" : "border-editorial-border divide-editorial-border"
            )}>
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "px-4 py-1.5 transition-colors", 
                  viewMode === 'grid' 
                    ? (isDarkMode ? "bg-zinc-100 text-zinc-900" : "bg-editorial-text text-white") 
                    : (isDarkMode ? "hover:bg-white/5 text-zinc-400" : "hover:bg-black/5 text-editorial-text/60")
                )}
                title="Grid"
              >
                <Grid2X2 size={14} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-4 py-1.5 transition-colors", 
                  viewMode === 'list' 
                    ? (isDarkMode ? "bg-zinc-100 text-zinc-900" : "bg-editorial-text text-white") 
                    : (isDarkMode ? "hover:bg-white/5 text-zinc-400" : "hover:bg-black/5 text-editorial-text/60")
                )}
                title="Lijst"
              >
                <List size={14} />
              </button>
              <button 
                onClick={() => setViewMode('series')}
                className={cn(
                  "px-4 py-1.5 transition-colors", 
                  viewMode === 'series' 
                    ? (isDarkMode ? "bg-zinc-100 text-zinc-900" : "bg-editorial-text text-white") 
                    : (isDarkMode ? "hover:bg-white/5 text-zinc-400" : "hover:bg-black/5 text-editorial-text/60")
                )}
                title="Series Wall"
              >
                <BookMarked size={14} />
              </button>
              <button 
                onClick={() => setViewMode('authors')}
                className={cn(
                  "px-4 py-1.5 transition-colors", 
                  viewMode === 'authors' 
                    ? (isDarkMode ? "bg-zinc-100 text-zinc-900" : "bg-editorial-text text-white") 
                    : (isDarkMode ? "hover:bg-white/5 text-zinc-400" : "hover:bg-black/5 text-editorial-text/60")
                )}
                title="Auteurs"
              >
                <Users size={14} />
              </button>
              <button 
                onClick={() => setViewMode('genres')}
                className={cn(
                  "px-4 py-1.5 transition-colors", 
                  viewMode === 'genres' 
                    ? (isDarkMode ? "bg-zinc-100 text-zinc-900" : "bg-editorial-text text-white") 
                    : (isDarkMode ? "hover:bg-white/5 text-zinc-400" : "hover:bg-black/5 text-editorial-text/60")
                )}
                title="Genres"
              >
                <Filter size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center min-w-0">
            <Search className={cn("mr-3 flex-shrink-0", isDarkMode ? "text-white" : "text-editorial-text/30")} size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('library.searchPlaceholder') || 'Search...'} 
              className={cn(
                "bg-transparent border-none text-sm w-full max-w-[240px] focus:outline-none focus:ring-0 font-medium",
                isDarkMode ? "placeholder-white text-white" : "placeholder-black/30 text-editorial-text"
              )}
            />
          </div>

          <div className="flex items-center gap-4 md:gap-8 flex-shrink-0">
            
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white" : "opacity-40")}>{t('common.total') || 'Totaal'}:</span>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-white" : "")}>{books.length}</span>
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
              isDarkMode={isDarkMode}
            />
          ) : viewMode === 'user-profile' && selectedSocialUser ? (
            <UserProfileDetail 
              user={selectedSocialUser} 
              onBack={() => setViewMode('feed')} 
              onChat={(u) => {
                setChatWithUser(u);
                setViewMode('messages');
              }}
              isDarkMode={isDarkMode}
            />
          ) : viewMode === 'messages' ? (
            <Messages 
              initialChatUser={chatWithUser} 
              onBack={() => setViewMode('feed')} 
              isDarkMode={isDarkMode}
            />
          ) : viewMode === 'stats' ? (
            <Stats books={books} isDarkMode={isDarkMode} readingGoal={userProfile?.readingGoal} />
          ) : viewMode === 'profile' ? (
            <ProfileView user={user} books={books} isDarkMode={isDarkMode} />
          ) : viewMode === 'admin' ? (
            <AdminDashboard isDarkMode={isDarkMode} />
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
                    {viewMode === 'grid' && (t('library.title') || "Collectie")}
                    {viewMode === 'list' && (t('library.listView') || "Lijst Weergave")}
                    {viewMode === 'series' && (t('library.seriesWall') || "Series Wall")}
                    {viewMode === 'authors' && (t('library.authorsOverview') || "Overzicht Auteurs")}
                    {viewMode === 'genres' && (t('library.genresOverview') || "Overzicht Genres")}
                    {viewMode === 'profile' && (t('library.myProfile') || "Mijn Profiel")}
                  </h2>
                  {searchQuery && (
                    <span className={cn("text-lg font-serif italic hidden md:inline", isDarkMode ? "text-white" : "text-black/40")}>{t('library.for') || 'voor'} "{searchQuery}"</span>
                  )}
                </div>
              </div>

              <div className="grid gap-8">
                {filteredBooks.length === 0 ? (
                  <div className={cn(
                    "h-96 flex flex-col items-center justify-center border rounded-none",
                    isDarkMode ? "border-zinc-800 text-white/20" : "border-editorial-border text-zinc-300"
                  )}>
                    <BookOpen size={48} className="mb-4 opacity-50" />
                    <p className={cn(
                      "font-serif italic text-xl mb-1",
                      isDarkMode ? "text-white/40" : "text-black/40"
                    )}>{t('library.nothingFound') || 'Niets gevonden'}</p>
                  </div>
                ) : viewMode === 'series' ? (
                  <div className="space-y-16">
                     {(Object.entries(seriesGroups) as [string, Book[]][]).map(([name, seriesBooks]) => (
                       <div key={name} className="space-y-6">
                          <div className="flex items-baseline gap-4 border-b border-editorial-border dark:border-zinc-800 pb-2">
                            <h2 className="text-3xl font-serif font-bold tracking-tight">{name}</h2>
                            <span className={cn("font-serif italic text-sm", isDarkMode ? "text-white" : "text-black/40")}>{seriesBooks.length} {t('library.volumes')}</span>
                          </div>
                          <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide">
                             {seriesBooks.map(book => (
                               <div key={book.id} style={{ minWidth: coverWidth, maxWidth: coverWidth }}>
                                 <BookItem book={book} mode="grid" onClick={() => setSelectedBook(book)} coverWidth={coverWidth} isDarkMode={isDarkMode} />
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
                          <div className="flex items-baseline gap-4 border-b border-editorial-border dark:border-zinc-800 pb-2">
                            <h2 className="text-3xl font-serif font-bold tracking-tight">{name}</h2>
                            <span className={cn("font-serif italic text-sm", isDarkMode ? "text-white" : "text-black/40")}>{authorBooks.length} {t('library.booksCount')}</span>
                          </div>
                          <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide">
                             {authorBooks.map(book => (
                               <div key={book.id} style={{ minWidth: coverWidth, maxWidth: coverWidth }}>
                                 <BookItem book={book} mode="grid" onClick={() => setSelectedBook(book)} coverWidth={coverWidth} isDarkMode={isDarkMode} />
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
                          <div className="flex items-baseline gap-4 border-b border-editorial-border dark:border-zinc-800 pb-2">
                            <h2 className="text-3xl font-serif font-bold tracking-tight">{name}</h2>
                            <span className={cn("font-serif italic text-sm", isDarkMode ? "text-white" : "text-black/40")}>{genreBooks.length} {t('library.booksCount')}</span>
                          </div>
                          <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide">
                             {genreBooks.map(book => (
                               <div key={book.id} style={{ minWidth: coverWidth, maxWidth: coverWidth }}>
                                 <BookItem book={book} mode="grid" onClick={() => setSelectedBook(book)} coverWidth={coverWidth} isDarkMode={isDarkMode} />
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
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <footer className={cn(
          "h-12 border-t flex items-center justify-between px-10 text-[10px] font-bold uppercase tracking-[0.15em]",
          isDarkMode ? "bg-zinc-900 border-zinc-800 text-white/40" : "bg-white border-editorial-border text-black/40"
        )}>
           <div className="flex gap-10">
              <span className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", isDarkMode ? "bg-editorial-accent-bright" : "bg-editorial-accent")}></div> 
                {books.length} {t('library.books') || 'Boeken'}
              </span>
              <span>{books.filter(b => b.readingStatus === (language === 'nl' ? 'Gelezen' : 'Finished') || b.readingStatus === 'Gelezen' || b.readingStatus === 'Finished').length} {t('library.read') || 'Gelezen'}</span>
           </div>
           <div className="flex gap-6">
              <span className={isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent"}>{t('library.statusOnline') || 'Status: Online'}</span>
              <span>{t('common.months.may') || 'MEI'} 2026</span>
           </div>
        </footer>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, isDarkMode }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, isDarkMode?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-0 py-1.5 transition-all duration-200 group text-left",
        active 
          ? (isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent") 
          : (isDarkMode ? "text-white/60 hover:text-white" : "text-black/50 hover:text-black")
      )}
    >
      <span className={cn("transition-all duration-300 text-[10px]", active ? "opacity-100" : "opacity-0 group-hover:opacity-40")}>
        ●
      </span>
      <span className={cn("text-sm font-medium", active ? "font-bold" : "")}>{label}</span>
      {active && (
        <motion.div 
          layoutId="sidebar-dot"
          className={cn("ml-auto w-1 h-1 rounded-full", isDarkMode ? "bg-editorial-accent-bright" : "bg-editorial-accent")}
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

function BookItem({ book, mode, onClick, coverWidth, isDarkMode }: { book: Book, mode: 'grid' | 'list', onClick: () => void, coverWidth?: number, isDarkMode?: boolean, key?: React.Key }) {
  const { language } = useLanguage();
  
  if (mode === 'list') {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "py-6 border-b flex items-center gap-8 transition-all group cursor-pointer px-4",
          isDarkMode ? "border-zinc-800 hover:bg-white/5" : "border-editorial-border hover:bg-neutral-50/50"
        )}
      >
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-bold text-sm uppercase tracking-tight transition-colors", isDarkMode ? "group-hover:text-editorial-accent-bright" : "group-hover:text-editorial-accent")}>{book.title}</h4>
          <p className={cn("text-xs italic mt-1", isDarkMode ? "text-white" : "text-black/50")}>{book.authors.join(', ')}</p>
        </div>
        
        <div className={cn(
          "flex items-center gap-12 text-[10px] font-bold uppercase tracking-widest",
          isDarkMode ? "text-white" : "text-black/40"
        )}>
          <span className="w-24 truncate italic opacity-60">{book.genre[0] || '-'}</span>
          <span className="w-40">{book.series ? `${book.series} #${book.seriesIndex}` : '-'}</span>
          <div className={cn("w-24 flex gap-0.5 items-center", isDarkMode ? "text-white" : "text-editorial-accent")}>
             {[1, 2, 3, 4, 5].map((s) => {
               const isFilled = s <= Math.round(book.rating || 0);
               return (
                 <Star 
                   key={s} 
                   size={10} 
                   strokeWidth={isFilled ? 1.5 : 2}
                   className={cn(
                     isFilled ? (isDarkMode ? "fill-editorial-accent-bright" : "fill-current") : "fill-transparent"
                   )} 
                 />
               );
             })}
          </div>
          <span className={cn(
            "px-3 py-1 border border-current text-[9px] min-w-[80px] text-center",
            book.readingStatus === 'Gelezen' ? (isDarkMode ? "text-green-500 bg-green-500/10" : "text-green-700 bg-green-50/50") :
            book.readingStatus === 'Bezig' ? (isDarkMode ? "text-blue-500 bg-blue-500/10" : "text-blue-700 bg-blue-50/50") :
            book.readingStatus === 'Wil ik lezen' ? (isDarkMode ? "text-orange-500 bg-orange-500/10" : "text-orange-700 bg-orange-50/50") :
            (isDarkMode ? "text-zinc-700 border-zinc-800" : "text-black/30")
          )}>
            {translateStatus(book.readingStatus, language)}
          </span>
        </div>
        
        <ChevronRight size={14} className={cn("transition-all", isDarkMode ? "text-white/10 group-hover:text-white/60" : "text-black/10 group-hover:text-black")} />
      </div>
    );
  }

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className={cn(
        "aspect-[2/3] overflow-hidden shadow-xl border relative mb-5 transition-all duration-500 group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]",
        isDarkMode ? "border-zinc-800 bg-zinc-900" : "border-black/10 bg-[#d9d5ce]"
      )}>
        {book.coverUrl ? (
          <img 
            src={book.coverUrl} 
            alt={book.title} 
            className={cn(
              "w-full h-full object-cover transition-all duration-700",
              isDarkMode ? "opacity-80 group-hover:opacity-100" : "grayscale-[0.2] group-hover:grayscale-0"
            )} 
            referrerPolicy="no-referrer" 
          />
        ) : (
          <div className={cn(
            "w-full h-full flex flex-col items-center justify-center p-6 text-center font-serif italic",
            isDarkMode ? "text-zinc-700" : "text-black/20"
          )}>
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
        <h3 className={cn("font-bold text-sm uppercase leading-tight transition-colors", isDarkMode ? "text-white group-hover:text-editorial-accent-bright" : "group-hover:text-editorial-accent")}>{book.title}</h3>
        <p className={cn("text-xs italic mt-1", isDarkMode ? "text-white" : "text-black/60")}>{book.authors.join(', ')}</p>
        
        {book.series && (
          <p className={cn("text-[10px] uppercase font-bold tracking-widest mt-1.5 flex items-center gap-1.5", isDarkMode ? "text-white" : "text-black/40")}>
            <BookMarked size={10} className="text-editorial-accent" />
            {book.series} <span className={cn(isDarkMode ? "text-white" : "text-editorial-accent")}>#{book.seriesIndex}</span>
          </p>
        )}

        <div className="mt-2 flex gap-0.5">
           {[1, 2, 3, 4, 5].map((s) => {
             const isFilled = s <= Math.round(book.rating || 0);
             return (
               <Star 
                 key={s} 
                 size={10} 
                 strokeWidth={isFilled ? 1.5 : 2}
                 className={cn(
                   isFilled ? (isDarkMode ? "fill-editorial-accent-bright" : "fill-current") : "fill-transparent",
                   isDarkMode ? "text-white" : "text-editorial-accent"
                 )} 
               />
             );
           })}
        </div>
      </div>
    </motion.div>
  );
}function SettingsView({ 
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
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="max-w-4xl space-y-12">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-12">
          <section className="space-y-6">
            <h3 className={cn("text-xl font-serif italic font-bold border-b pb-2", isDarkMode ? "text-editorial-accent-bright border-zinc-800" : "text-editorial-accent border-editorial-border")}>{t('settings.interface') || 'Interface'}</h3>
            
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                 <div>
                   <p className={cn("font-bold uppercase text-xs tracking-widest", isDarkMode ? "text-zinc-200" : "text-black")}>{t('settings.language') || 'Taal'}</p>
                   <p className={cn("text-xs italic", isDarkMode ? "text-zinc-600" : "text-black/40")}>{t('settings.languageDesc') || 'Kies je voorkeurstaal'}</p>
                 </div>
                 <div className={cn(
                   "flex border",
                   isDarkMode ? "border-zinc-800" : "border-editorial-border"
                 )}>
                   <button 
                    onClick={() => setLanguage('en')}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors",
                      language === 'en' 
                        ? (isDarkMode ? "bg-zinc-100 text-zinc-900" : "bg-editorial-text text-white") 
                        : (isDarkMode ? "bg-transparent text-zinc-500 hover:text-white" : "bg-transparent text-black/40 hover:text-black")
                    )}
                   >
                     EN
                   </button>
                   <button 
                    onClick={() => setLanguage('nl')}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors",
                      language === 'nl' 
                        ? (isDarkMode ? "bg-zinc-100 text-zinc-900" : "bg-editorial-text text-white") 
                        : (isDarkMode ? "bg-transparent text-zinc-500 hover:text-white" : "bg-transparent text-black/40 hover:text-black")
                    )}
                   >
                     NL
                   </button>
                 </div>
              </div>

              <div className="flex items-center justify-between">
                 <div>
                   <p className={cn("font-bold uppercase text-xs tracking-widest", isDarkMode ? "text-zinc-200" : "text-black")}>{t('settings.darkMode') || 'Donkere Modus'}</p>
                   <p className={cn("text-xs italic", isDarkMode ? "text-zinc-600" : "text-black/40")}>{t('settings.darkModeDesc') || 'Voor nachtelijk lezen'}</p>
                 </div>
                 <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={cn(
                    "w-12 h-6 border p-1 transition-colors duration-300",
                    isDarkMode ? "bg-white border-white" : "bg-transparent border-editorial-border"
                  )}
                 >
                   <div className={cn(
                     "w-4 h-4 transition-transform duration-300",
                     isDarkMode ? "translate-x-6 bg-black" : "translate-x-0 bg-black"
                   )} />
                 </button>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className={cn("text-xl font-serif italic font-bold border-b pb-2", isDarkMode ? "text-editorial-accent-bright border-zinc-800" : "text-editorial-accent border-editorial-border")}>{t('settings.display') || 'Weergave'}</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <p className={cn("font-bold uppercase text-xs tracking-widest", isDarkMode ? "text-zinc-200" : "text-black")}>{t('settings.coverSize') || 'Grootte Boekomslag'}</p>
                  <span className={cn("text-xs font-mono", isDarkMode ? "text-zinc-700" : "text-black/40")}>{coverWidth}px</span>
                </div>
                <input 
                  type="range" 
                  min="120" 
                  max="320" 
                  step="10"
                  value={coverWidth}
                  onChange={(e) => setCoverWidth(parseInt(e.target.value))}
                  className={cn("w-full h-1 rounded-none appearance-none cursor-pointer accent-editorial-accent", isDarkMode ? "bg-zinc-800" : "bg-editorial-border")}
                />
                <div className={cn("flex justify-between mt-1 text-[8px] font-bold uppercase tracking-widest italic", isDarkMode ? "text-zinc-800" : "text-black/30")}>
                  <span>S</span>
                  <span>M</span>
                  <span>L</span>
                  <span>XL</span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className={cn("text-xl font-serif italic font-bold border-b pb-2", isDarkMode ? "text-editorial-accent-bright border-zinc-800" : "text-editorial-accent border-editorial-border")}>{t('settings.data') || 'Bibliotheek Data'}</h3>
            <div className="space-y-2">
               <SettingsButton label={t('settings.exportJson') || 'Exporteer Bibliotheek (JSON)'} isDarkMode={isDarkMode} />
               <SettingsButton label={t('settings.exportCsv') || 'Exporteer als CSV'} isDarkMode={isDarkMode} />
            </div>
          </section>
        </div>

        <div className={cn("flex flex-col items-center justify-start pt-12 space-y-4 border p-8", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-black/[0.02] border-editorial-border")}>
           <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] mb-4 italic", isDarkMode ? "text-zinc-700" : "text-black/30")}>{t('settings.previewTitle') || 'Voorbeeld Weergave'}</p>
           <div className="relative group" style={{ width: coverWidth }}>
             <div className={cn("aspect-[2/3] overflow-hidden shadow-2xl border", isDarkMode ? "border-zinc-800 bg-zinc-900" : "border-black/10 bg-[#d9d5ce]")}>
                <img 
                  src="https://images.unsplash.com/photo-1543005814-14b24e82ff3e?q=80&w=800&auto=format&fit=crop" 
                  alt="Preview" 
                  className={cn("w-full h-full object-cover", isDarkMode ? "opacity-70 group-hover:opacity-100" : "")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex flex-col justify-end">
                  <div className="h-1 bg-editorial-accent w-full"></div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <h4 className={cn("font-bold text-xs uppercase tracking-tight", isDarkMode ? "text-white" : "text-black")}>{t('settings.previewBookTitle') || 'Titel van het Boek'}</h4>
                <p className={cn("text-[10px] italic", isDarkMode ? "text-white" : "text-black/50")}>{t('settings.previewAuthorName') || 'Auteur Naam'}</p>
              </div>
           </div>
           <p className={cn("text-[10px] italic mt-8 text-center max-w-[200px]", isDarkMode ? "text-white" : "text-black/30")}>
             {t('settings.previewDesc') || 'Pas de schuifbalk aan om de ideale grootte voor jouw collectie te vinden.'}
           </p>
        </div>
      </section>
    </div>
  );
}

function SettingsButton({ label, isDarkMode }: { label: string, isDarkMode?: boolean }) {
  return (
    <button className={cn(
      "w-full flex items-center justify-between py-4 border-b transition-colors px-2 text-left group",
      isDarkMode ? "border-zinc-800 hover:bg-zinc-800/40" : "border-editorial-border hover:bg-black/5"
    )}>
       <span className={cn("font-bold text-xs uppercase tracking-widest italic group-hover:text-editorial-accent", isDarkMode ? "text-zinc-400" : "text-black")}>{label}</span>
       <ChevronRight size={14} className={isDarkMode ? "text-zinc-700 group-hover:text-zinc-200" : "text-black/20 group-hover:text-black"} />
    </button>
  );
}

function LoginView({ onAuth, onGoogleAuth, error, isLoggingIn, isDarkMode }: { onAuth: (email: string, password: string, isSignUp: boolean) => void, onGoogleAuth: () => void, error: string | null, isLoggingIn: boolean, isDarkMode: boolean }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    onAuth(email, password, isSignUp);
  };

  return (
    <div className={cn("h-screen w-full flex items-center justify-center overflow-hidden relative font-sans", isDarkMode ? "bg-zinc-950" : "bg-editorial-bg")}>
      <div className="absolute inset-0 z-0">
         <div className={cn("absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none", isDarkMode ? "bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" : "bg-[url('https://www.transparenttextures.com/patterns/felt.png')]")}></div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative z-10 text-center w-full max-w-md px-10 border py-16 shadow-2xl",
          isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border"
        )}
      >
        <div className="w-16 h-16 bg-editorial-accent flex items-center justify-center text-white mx-auto mb-8 shadow-lg">
          <Library size={28} />
        </div>
        
        <h1 className={cn("text-5xl font-serif font-black tracking-tighter mb-4 leading-none italic", isDarkMode ? "text-white" : "text-editorial-text")}>
          LibraryVault
        </h1>
        
        <p className={cn("mb-10 text-sm font-serif italic max-w-xs mx-auto", isDarkMode ? "text-zinc-600" : "text-editorial-text/60")}>
          {isSignUp ? t('auth.signupTitle') : t('auth.loginTitle')}
        </p>
        
        <div className="space-y-4 mb-8">
          <button 
            type="button"
            onClick={onGoogleAuth}
            disabled={isLoggingIn}
            className={cn(
              "w-full flex items-center justify-center gap-3 py-3 px-4 border transition-colors rounded-none font-bold text-[10px] uppercase tracking-widest disabled:opacity-50",
              isDarkMode ? "border-zinc-800 text-zinc-400 hover:bg-zinc-800" : "border-editorial-border hover:bg-neutral-50 text-black"
            )}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 1.2-4.53z" />
            </svg>
            {t('auth.googleLogin')}
          </button>
          
          <div className="relative">
            <div className={cn("absolute inset-0 flex items-center", isDarkMode ? "opacity-20" : "")}><span className={cn("w-full border-t", isDarkMode ? "border-zinc-700" : "border-editorial-border")}></span></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className={cn("px-4 font-bold italic", isDarkMode ? "bg-zinc-900 text-zinc-700" : "bg-white text-black/30")}>{t('auth.or')}</span></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className={cn("text-[10px] font-bold uppercase tracking-widest italic px-1", isDarkMode ? "text-zinc-700" : "text-black/40")}>{t('auth.email')}</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-none border focus:outline-none focus:border-editorial-accent text-sm transition-colors",
                isDarkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-800" : "bg-white border-editorial-border text-editorial-text"
              )}
              placeholder={t('auth.emailPlaceholder')}
            />
          </div>
          
          <div className="space-y-1">
            <label className={cn("text-[10px] font-bold uppercase tracking-widest italic px-1", isDarkMode ? "text-zinc-700" : "text-black/40")}>{t('auth.password')}</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-none border focus:outline-none focus:border-editorial-accent text-sm transition-colors",
                isDarkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-800" : "bg-white border-editorial-border text-editorial-text"
              )}
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
            className={cn(
              "w-full py-4 rounded-none font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all disabled:bg-neutral-400 mt-6 flex items-center justify-center gap-3",
              isDarkMode ? "bg-white text-zinc-900 hover:bg-zinc-200" : "bg-editorial-text text-white hover:bg-neutral-800 shadow-black/10"
            )}
          >
            {isLoggingIn && <div className={cn("w-4 h-4 border-2 rounded-full animate-spin", isDarkMode ? "border-zinc-900/30 border-t-zinc-900" : "border-white/30 border-t-white")}></div>}
            {isLoggingIn ? t('auth.loggingIn') : (isSignUp ? t('auth.signup') : t('auth.login'))}
          </button>
        </form>

        <div className={cn("mt-8 pt-6 border-t", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
            }}
            className={cn("text-[10px] font-bold uppercase tracking-widest hover:underline italic", isDarkMode ? "text-editorial-accent" : "text-editorial-accent")}
          >
            {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}
          </button>
        </div>
      </motion.div>
      
      <div className={cn("absolute bottom-10 left-0 w-full flex items-center justify-center gap-16 pointer-events-none opacity-30", isDarkMode ? "text-zinc-700" : "text-black")}>
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

