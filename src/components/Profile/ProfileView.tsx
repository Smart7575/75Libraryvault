import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  MapPin, 
  Globe, 
  Mail, 
  Facebook, 
  Instagram, 
  Calendar, 
  Target, 
  Star, 
  BookOpen, 
  Save,
  Check,
  X,
  Search
} from 'lucide-react';
import { userService, UserProfile } from '../../services/userService';
import { Book } from '../../services/bookService';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileViewProps {
  user: any;
  books: Book[];
  isDarkMode?: boolean;
}

export default function ProfileView({ user, books, isDarkMode }: ProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [showBookSelector, setShowBookSelector] = useState<'favorite' | 'current' | null>(null);
  const [bookSearch, setBookSearch] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.uid) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const data = await userService.getProfile(user.uid);
    if (data) {
      setProfile(data);
      setFormData(data);
    } else {
      // If no profile exists yet, pre-fill with auth user data
      const initialData: Partial<UserProfile> = {
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
      };
      setFormData(initialData);
    }
  };

  const [showSuccess, setShowSuccess] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("Deze foto is te groot. Selecteer een foto van maximaal 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await userService.updateProfile(user.uid, formData);
      await fetchProfile();
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Er is een fout opgetreden bij het opslaan. Probeer het opnieuw.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedFavorite = books.find(b => b.id === (isEditing ? formData.favoriteBookId : profile?.favoriteBookId));
  const selectedCurrent = books.find(b => b.id === (isEditing ? formData.currentBookId : profile?.currentBookId)) || books.find(b => b.readingStatus === 'Bezig');

  const finishedBooks = books.filter(b => b.readingStatus === 'Gelezen');
  const booksWithPages = finishedBooks.filter(b => b.pageCount && b.pageCount > 0);
  const totalPagesRead = booksWithPages.reduce((sum, b) => sum + (b.pageCount || 0), 0);
  
  const booksWithSpeed = finishedBooks.filter(b => b.pagesPerDay && b.pagesPerDay > 0);
  const avgPagesPerDay = booksWithSpeed.length > 0 
    ? (booksWithSpeed.reduce((sum, b) => sum + (b.pagesPerDay || 0), 0) / booksWithSpeed.length).toFixed(1)
    : 0;

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) || 
    b.authors.some(a => a.toLowerCase().includes(bookSearch.toLowerCase()))
  );

  if (!profile && !isEditing && !formData.email) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-editorial-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] bg-green-600 text-white px-6 py-3 font-bold text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-3 border border-green-500"
          >
            <Check size={14} /> Profiel succesvol bijgewerkt
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handlePhotoUpload}
      />

      {/* Header / Cover */}
      <div className="relative group">
        <div className={cn(
          "h-48 border overflow-hidden relative",
          isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-editorial-accent/10 border-editorial-border"
        )}>
          <div className={cn("absolute inset-0 opacity-20 pointer-events-none", isDarkMode ? "bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" : "")} style={isDarkMode ? {} : { backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        </div>
        
        <div className="px-8 -mt-16 flex items-end justify-between relative z-10">
          <div className="flex items-end gap-6 text-left">
            <div className="relative group/avatar">
              <img 
                src={formData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="Profile" 
                className={cn("w-32 h-32 rounded-none border-4 object-cover shadow-xl", isDarkMode ? "border-zinc-900 bg-zinc-950" : "border-editorial-bg bg-white")}
                referrerPolicy="no-referrer"
              />
              {isEditing && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="text-[10px] text-white font-bold uppercase tracking-widest px-2 text-center">Foto Uploaden</span>
                </div>
              )}
            </div>
            <div className="pb-2">
              <h1 className="text-4xl font-serif font-black tracking-tight flex items-center gap-3">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.displayName || ''} 
                    onChange={e => setFormData({...formData, displayName: e.target.value})}
                    className={cn("bg-transparent border-b focus:outline-none min-w-[200px]", isDarkMode ? "border-white/20 focus:border-editorial-accent-bright" : "border-editorial-text")}
                    placeholder="Naam"
                  />
                ) : (
                  profile?.displayName || user.displayName
                )}
              </h1>
              <p className={cn("font-serif italic", isDarkMode ? "text-white/40" : "text-black/40")}>{profile?.email || user.email}</p>
            </div>
          </div>
          
          <div className="pb-4">
            {isEditing ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => { setIsEditing(false); setFormData(profile || {}); }}
                  className={cn("px-6 py-2 border font-bold text-[10px] uppercase tracking-widest hover:bg-black/5 transition-colors", isDarkMode ? "border-zinc-800 text-white/40" : "border-editorial-border")}
                >
                  Annuleren
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "px-6 py-2 font-bold text-[10px] uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 transition-all",
                    isDarkMode ? "bg-zinc-100 text-zinc-900 hover:bg-white" : "bg-editorial-text text-white hover:bg-neutral-800"
                  )}
                >
                  {isSaving ? 'Bezig...' : <><Save size={12} /> Opslaan</>}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className={cn(
                  "px-8 py-3 font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg",
                  isDarkMode ? "bg-zinc-100 text-zinc-900 hover:bg-white" : "bg-editorial-text text-white hover:bg-neutral-800"
                )}
              >
                Profiel Bewerken
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-8">
        {/* Left Column: Personal Info */}
        <div className="md:col-span-1 space-y-8">
          <section className="space-y-4">
            <h3 className={cn("text-xs font-bold uppercase tracking-[0.2em] border-b pb-2 italic", isDarkMode ? "text-editorial-accent-bright border-zinc-800" : "text-editorial-accent border-editorial-border")}>Persoonlijk</h3>
            <div className="space-y-4">
              <InfoRow 
                icon={<Calendar size={14} />} 
                label="Geboortedatum" 
                value={formData.birthDate || 'Niet opgegeven'} 
                isEditing={isEditing}
                onChange={v => setFormData({...formData, birthDate: v})}
                isDarkMode={isDarkMode}
              />
              <InfoRow 
                icon={<MapPin size={14} />} 
                label="Woonplaats" 
                value={formData.city || 'Niet opgegeven'} 
                isEditing={isEditing}
                onChange={v => setFormData({...formData, city: v})}
                isDarkMode={isDarkMode}
              />
              <InfoRow 
                icon={<Globe size={14} />} 
                label="Land" 
                value={formData.country || 'Niet opgegeven'} 
                isEditing={isEditing}
                onChange={v => setFormData({...formData, country: v})}
                isDarkMode={isDarkMode}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className={cn("text-xs font-bold uppercase tracking-[0.2em] border-b pb-2 italic", isDarkMode ? "text-editorial-accent-bright border-zinc-800" : "text-editorial-accent border-editorial-border")}>Social</h3>
            <div className="space-y-4">
              <InfoRow 
                icon={<Facebook size={14} />} 
                label="Facebook" 
                value={formData.facebook || '-'} 
                isEditing={isEditing}
                onChange={v => setFormData({...formData, facebook: v})}
                isDarkMode={isDarkMode}
              />
              <InfoRow 
                icon={<Instagram size={14} />} 
                label="Instagram" 
                value={formData.instagram || '-'} 
                isEditing={isEditing}
                onChange={v => setFormData({...formData, instagram: v})}
                isDarkMode={isDarkMode}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className={cn("text-xs font-bold uppercase tracking-[0.2em] border-b pb-2 italic", isDarkMode ? "text-editorial-accent-bright border-zinc-800" : "text-editorial-accent border-editorial-border")}>Doelen & Statistiek</h3>
            <div className="space-y-6">
              <div>
                <div className={cn("flex items-center gap-3 mb-1 px-1", isDarkMode ? "text-white/40" : "text-black/50")}>
                  <Target size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Leesdoel 2026</span>
                </div>
                {isEditing ? (
                  <input 
                    type="number" 
                    value={formData.readingGoal || 0}
                    onChange={e => setFormData({...formData, readingGoal: parseInt(e.target.value)})}
                    className={cn("w-full border px-3 py-2 text-sm focus:outline-none focus:border-editorial-accent-bright", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-editorial-border")}
                  />
                ) : (
                  <div className={cn("px-6 py-4 border", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-editorial-border")}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-2xl font-serif font-black">{finishedBooks.length}</span>
                      <span className={cn("text-xs font-serif italic", isDarkMode ? "text-white" : "text-black/40")}>van de {profile?.readingGoal || 0} boeken</span>
                    </div>
                    <div className={cn("h-1 w-full", isDarkMode ? "bg-zinc-900" : "bg-neutral-100")}>
                      <div 
                        className={cn("h-full transition-all duration-1000", isDarkMode ? "bg-editorial-accent-bright" : "bg-editorial-accent")}
                        style={{ width: `${Math.min(100, (finishedBooks.length / (profile?.readingGoal || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className={cn("border p-4", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-editorial-border")}>
                  <span className={cn("block text-[8px] font-bold uppercase tracking-widest mb-1 italic", isDarkMode ? "text-white" : "text-black/40")}>Totaal Pagina's</span>
                  <span className="text-lg font-serif font-black">{totalPagesRead.toLocaleString()}</span>
                </div>
                <div className={cn("border p-4", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-editorial-border")}>
                  <span className={cn("block text-[8px] font-bold uppercase tracking-widest mb-1 italic", isDarkMode ? "text-white" : "text-black/40")}>Snelheid (gem)</span>
                  <span className="text-lg font-serif font-black">{avgPagesPerDay} <span className="text-[10px] opacity-30">p/d</span></span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Book Highlights */}
        <div className="md:col-span-2 space-y-12">
          <section className="space-y-6">
            <h3 className={cn("text-xs font-bold uppercase tracking-[0.2em] border-b pb-2 italic", isDarkMode ? "text-editorial-accent-bright border-zinc-800" : "text-editorial-accent border-editorial-border")}>Geselecteerde Boeken</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Favorite Book */}
              <div className="space-y-3">
                <div className={cn("flex items-center gap-2 px-1", isDarkMode ? "text-white/40" : "text-black/50")}>
                  <Star size={14} className={cn("fill-current", isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent")} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Favoriete Boek</span>
                </div>
                {isEditing ? (
                  <button 
                    onClick={() => setShowBookSelector('favorite')}
                    className={cn(
                      "w-full aspect-[2/3] border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-colors group",
                      isDarkMode ? "bg-zinc-950 border-zinc-800 hover:bg-zinc-900" : "bg-white border-editorial-border hover:bg-black/5"
                    )}
                  >
                    {selectedFavorite ? (
                      <>
                        <img src={selectedFavorite.coverUrl} className="w-full h-full object-cover mb-4" />
                        <p className="text-[10px] font-bold uppercase">{selectedFavorite.title}</p>
                      </>
                    ) : (
                      <>
                        <BookOpen size={24} className={cn("mb-2 transition-colors", isDarkMode ? "text-white/10 group-hover:text-white/20" : "text-black/20 group-hover:text-black/40")} />
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-white/20" : "text-black/40")}>Kies een boek</p>
                      </>
                    )}
                  </button>
                ) : (
                  <div className={cn("border p-4 shadow-sm group", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border")}>
                    {selectedFavorite ? (
                       <div className="flex gap-4">
                         <div className={cn("w-20 aspect-[2/3] flex-shrink-0", isDarkMode ? "bg-zinc-950" : "bg-neutral-100")}>
                           {selectedFavorite.coverUrl && <img src={selectedFavorite.coverUrl} className={cn("w-full h-full object-cover", isDarkMode ? "opacity-90" : "")} />}
                         </div>
                         <div className="flex-1 min-w-0 pt-2">
                           <h4 className={cn("text-sm font-bold uppercase tracking-tight line-clamp-2", isDarkMode ? "text-white group-hover:text-editorial-accent-bright" : "text-editorial-text group-hover:text-editorial-accent")}>{selectedFavorite.title}</h4>
                           <p className={cn("text-[10px] italic mt-1", isDarkMode ? "text-white" : "text-black/50")}>{selectedFavorite.authors.join(', ')}</p>
                           <div className="flex gap-0.5 mt-1">
                             {[...Array(5)].map((_, i) => {
                               const isFilled = i < (selectedFavorite?.rating || 5); // Default to 5 for favorite if not set
                               return (
                                 <Star 
                                   key={i} 
                                   size={12} 
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
                       </div>
                    ) : (
                      <p className={cn("text-xs italic py-8 text-center uppercase tracking-widest", isDarkMode ? "text-white" : "text-black/30")}>Geen favoriet geselecteerd</p>
                    )}
                  </div>
                )}
              </div>

              {/* Currently Reading */}
              <div className="space-y-3">
                <div className={cn("flex items-center gap-2 px-1", isDarkMode ? "text-white/40" : "text-black/50")}>
                  <BookOpen size={14} className={isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent"} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Nu aan het lezen</span>
                </div>
                {isEditing ? (
                  <button 
                    onClick={() => setShowBookSelector('current')}
                    className={cn(
                      "w-full aspect-[2/3] border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-colors group",
                      isDarkMode ? "bg-zinc-950 border-zinc-800 hover:bg-zinc-900" : "bg-white border-editorial-border hover:bg-black/5"
                    )}
                  >
                    {selectedCurrent ? (
                      <>
                        <img src={selectedCurrent.coverUrl} className="w-full h-full object-cover mb-4" />
                        <p className="text-[10px] font-bold uppercase">{selectedCurrent.title}</p>
                      </>
                    ) : (
                      <>
                        <BookOpen size={24} className={cn("mb-2 transition-colors", isDarkMode ? "text-white/10 group-hover:text-white/20" : "text-black/20 group-hover:text-black/40")} />
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-white/20" : "text-black/40")}>Kies een boek</p>
                      </>
                    )}
                  </button>
                ) : (
                  <div className={cn("border p-4 shadow-sm group", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border")}>
                    {selectedCurrent ? (
                       <div className="flex gap-4">
                         <div className={cn("w-20 aspect-[2/3] flex-shrink-0", isDarkMode ? "bg-zinc-950" : "bg-neutral-100")}>
                           {selectedCurrent.coverUrl && <img src={selectedCurrent.coverUrl} className={cn("w-full h-full object-cover", isDarkMode ? "opacity-90" : "")} />}
                         </div>
                         <div className="flex-1 min-w-0 pt-2">
                           <h4 className={cn("text-sm font-bold uppercase tracking-tight line-clamp-2", isDarkMode ? "text-white group-hover:text-editorial-accent-bright" : "text-editorial-text group-hover:text-editorial-accent")}>{selectedCurrent.title}</h4>
                           <p className={cn("text-[10px] italic mt-1", isDarkMode ? "text-white/30" : "text-black/50")}>{selectedCurrent.authors.join(', ')}</p>
                           <div className={cn("mt-3 font-bold text-[8px] uppercase tracking-widest", isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent")}>
                             BEZIG MET LEZEN
                           </div>
                         </div>
                       </div>
                    ) : (
                      <p className={cn("text-xs italic py-8 text-center uppercase tracking-widest", isDarkMode ? "text-white" : "text-black/30")}>Geen boek geselecteerd</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Book Selector Overlay */}
      <AnimatePresence>
        {showBookSelector && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-xl border shadow-2xl flex flex-col max-h-[80vh] transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800 text-neutral-100" : "bg-editorial-bg border-editorial-border text-editorial-text"
              )}
            >
              <div className={cn("p-6 border-b flex items-center justify-between", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
                <h3 className="text-xl font-serif font-black uppercase tracking-tight italic leading-none">
                  Selecteer {showBookSelector === 'favorite' ? 'Favoriet' : 'Boek'}
                </h3>
                <button onClick={() => setShowBookSelector(null)} className={cn("p-2 transition-all", isDarkMode ? "text-zinc-500 hover:text-zinc-200" : "hover:bg-black/5 opacity-40 hover:opacity-100")}>
                  <X size={20} />
                </button>
              </div>
              <div className={cn("p-4 border-b flex items-center gap-3 transition-colors", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-editorial-border")}>
                <Search size={16} className={cn(isDarkMode ? "text-white/20" : "text-black/30")} />
                <input 
                  type="text" 
                  value={bookSearch}
                  onChange={e => setBookSearch(e.target.value)}
                  placeholder="Zoek in collectie..."
                  className="flex-1 bg-transparent border-none text-sm focus:outline-none placeholder:text-white/20"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredBooks.map(book => (
                  <button 
                    key={book.id}
                    onClick={() => {
                      if (showBookSelector === 'favorite') setFormData({...formData, favoriteBookId: book.id});
                      if (showBookSelector === 'current') setFormData({...formData, currentBookId: book.id});
                      setShowBookSelector(null);
                      setBookSearch('');
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-3 border transition-colors text-left group",
                      isDarkMode ? "hover:bg-zinc-800 border-transparent hover:border-zinc-700" : "hover:bg-black/5 border-transparent hover:border-editorial-border"
                    )}
                  >
                    <div className={cn("w-12 h-18 aspect-[2/3] flex-shrink-0", isDarkMode ? "bg-zinc-950" : "bg-neutral-100")}>
                      {book.coverUrl && <img src={book.coverUrl} className={cn("w-full h-full object-cover", isDarkMode ? "opacity-90" : "")} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("text-sm font-bold uppercase tracking-tight truncate", isDarkMode ? "group-hover:text-editorial-accent-bright" : "group-hover:text-editorial-accent")}>{book.title}</h4>
                      <p className={cn("text-[10px] italic truncate", isDarkMode ? "text-white/30" : "text-black/50")}>{book.authors.join(', ')}</p>
                    </div>
                  </button>
                ))}
                {filteredBooks.length === 0 && (
                  <p className={cn("text-center py-12 text-sm italic", isDarkMode ? "text-white/20" : "text-black/30")}>Geen boeken gevonden</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ icon, label, value, isEditing, onChange, isDarkMode }: { icon: React.ReactNode, label: string, value: string, isEditing: boolean, onChange: (v: string) => void, isDarkMode?: boolean }) {
  return (
    <div>
      <div className={cn("flex items-center gap-3 mb-1 px-1", isDarkMode ? "text-editorial-accent-bright" : "text-black/40")}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      {isEditing ? (
        <input 
          type="text" 
          value={value === 'Niet opgegeven' || value === '-' ? '' : value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            "w-full border px-3 py-2 text-sm focus:outline-none focus:border-editorial-accent-bright transition-colors",
            isDarkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-editorial-border text-editorial-text"
          )}
          placeholder={label}
        />
      ) : (
        <p className={cn("text-sm font-medium px-1", isDarkMode ? "text-white" : "text-editorial-text")}>{value}</p>
      )}
    </div>
  );
}
