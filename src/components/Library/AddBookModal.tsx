import React, { useState } from 'react';
import { X, Search, Globe, Book as BookIcon, ChevronRight, Check, Loader2, Link, FileType } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { metadataService, ExternalBook } from '../../services/metadataService';
import { Book, bookService } from '../../services/bookService';
import { useLanguage } from '../../lib/LanguageContext';
import { translateStatus } from '../../translations';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: () => void;
  isDarkMode?: boolean;
}

export default function AddBookModal({ isOpen, onClose, onBookAdded, isDarkMode }: AddBookModalProps) {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<'search' | 'form'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExternalBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local string states for array fields to avoid space issues during typing
  const [authorsInput, setAuthorsInput] = useState('');
  const [genresInput, setGenresInput] = useState('');

  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    authors: [],
    genre: [],
    readingStatus: 'Ongelezen',
    format: 'epub'
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    try {
      const results = await metadataService.searchBooks(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setError(t('library.searchFailed') || 'Zoeken mislukt. Probeer het later opnieuw.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectBook = (result: ExternalBook) => {
    setAuthorsInput(result.authors.join(', '));
    setGenresInput(result.genre?.join(', ') || '');
    setFormData({
      title: result.title,
      authors: result.authors,
      description: result.description || '',
      coverUrl: result.coverUrl || '',
      isbn: result.isbn || '',
      genre: result.genre || [],
      publishedDate: result.publishedDate || '',
      language: result.language || '',
      pageCount: result.pageCount,
      readingStatus: 'Ongelezen',
      format: 'epub'
    });
    setStep('form');
  };

  const skipSearch = () => {
    setAuthorsInput('');
    setGenresInput('');
    setFormData({
      title: '',
      authors: [],
      genre: [],
      readingStatus: 'Ongelezen',
      format: 'epub'
    });
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Sanitize data
    const cleanData = { ...formData };
    
    // Process string inputs into arrays
    cleanData.authors = authorsInput.split(',').map(s => s.trim()).filter(Boolean);
    cleanData.genre = genresInput.split(',').map(s => s.trim()).filter(Boolean);

    // Ensure numbers are numbers or removed
    if (cleanData.seriesIndex !== undefined) {
      const idx = parseInt(cleanData.seriesIndex as any);
      if (isNaN(idx)) {
        delete cleanData.seriesIndex;
      } else {
        cleanData.seriesIndex = idx;
      }
    }

    if (!cleanData.series) delete cleanData.series;
    // Set dates based on status
    if (cleanData.readingStatus === 'Bezig') {
      cleanData.startDate = new Date().toISOString();
    } else if (cleanData.readingStatus === 'Gelezen') {
      cleanData.endDate = new Date().toISOString();
    }

    try {
      await bookService.addBook(cleanData as any);
      onBookAdded();
      onClose();
      // Reset state for next time
      setStep('search');
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      console.error('Failed to add book:', err);
      try {
        const firestoreError = JSON.parse(err.message);
        setError(`${t('common.error') || 'Fout'}: ${firestoreError.error}`);
      } catch {
        setError(t('library.addFailed') || 'Het boek kon niet worden toegevoegd. Controleer de velden.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm", isDarkMode ? "bg-black/60" : "bg-black/40")}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          "w-full max-w-2xl rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border",
          isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border"
        )}
      >
        <div className={cn("p-6 border-b flex items-center justify-between transition-colors", isDarkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-editorial-border text-editorial-text")}>
          <h2 className="text-xl font-serif italic tracking-tight font-bold">{t('library.addBook') || 'Nieuw Boek Toevoegen'}</h2>
          <button onClick={onClose} className="p-2 hover:text-editorial-accent transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className={cn("flex-1 overflow-y-auto p-10 transition-colors", isDarkMode ? "bg-zinc-950" : "bg-editorial-bg/30")}>
          {step === 'search' ? (
            <div className="space-y-10">
              <div className="text-center max-w-md mx-auto">
                <p className={cn("mb-8 font-serif italic", isDarkMode ? "text-zinc-600" : "text-editorial-text/50")}>{t('library.searchMetadataDesc') || 'Zoek een boek om metadata automatisch op te halen.'}</p>
                <form onSubmit={handleSearch} className="relative">
                  <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2", isDarkMode ? "text-zinc-800" : "text-editorial-text/30")} size={18} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('library.searchBookPlaceholder') || "Titel, auteur of ISBN..."}
                    className={cn(
                      "w-full pl-12 pr-28 py-4 rounded-none border focus:outline-none transition-all text-base",
                      isDarkMode ? "bg-zinc-900 border-zinc-800 text-white focus:border-editorial-accent placeholder:text-zinc-800" : "bg-white border-editorial-border focus:border-editorial-text"
                    )}
                    autoFocus
                  />
                  <button 
                    disabled={isSearching}
                    className={cn(
                      "absolute right-1 top-1 bottom-1 px-6 rounded-none text-[10px] font-bold uppercase tracking-widest transition-colors",
                      isDarkMode ? "bg-white text-zinc-950 hover:bg-neutral-200 disabled:bg-zinc-800" : "bg-editorial-text text-white hover:bg-neutral-800 disabled:bg-neutral-200"
                    )}
                  >
                    {isSearching ? <Loader2 size={16} className="animate-spin" /> : (t('common.search') || "Zoek")}
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                {searchResults.map((result, idx) => (
                  <button 
                    key={idx}
                    onClick={() => selectBook(result)}
                    className={cn(
                      "w-full text-left p-4 rounded-none border transition-all flex items-center gap-6 group",
                      isDarkMode ? "border-zinc-800 bg-zinc-900 hover:border-editorial-accent" : "border-editorial-border bg-white hover:border-editorial-text"
                    )}
                  >
                    <div className={cn("w-16 h-24 rounded-none overflow-hidden shadow-sm flex-shrink-0 border", isDarkMode ? "border-zinc-800 bg-black" : "bg-neutral-100 border-black/5")}>
                      {result.coverUrl ? (
                         <img src={result.coverUrl} alt={result.title} className={cn("w-full h-full object-cover", isDarkMode ? "opacity-70" : "")} referrerPolicy="no-referrer" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-neutral-300">
                           <BookIcon size={20} />
                         </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("font-bold text-xs uppercase tracking-tight group-hover:text-editorial-accent transition-colors truncate", isDarkMode ? "text-zinc-200" : "text-black")}>{result.title}</h4>
                      <p className={cn("text-xs italic mt-1", isDarkMode ? "text-zinc-600" : "text-editorial-text/50")}>{result.authors.join(', ')}</p>
                      <div className="mt-3 flex items-center gap-4">
                         <span className={cn("text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/30")}>
                           <Globe size={10} /> {result.source}
                         </span>
                         {result.publishedDate && (
                           <span className={cn("text-[9px] font-bold uppercase tracking-widest italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/30")}>
                             {result.publishedDate.split('-')[0]}
                           </span>
                         )}
                      </div>
                    </div>
                    <ChevronRight size={18} className={cn("transition-colors", isDarkMode ? "text-zinc-800 group-hover:text-zinc-500" : "text-neutral-200 group-hover:text-editorial-text")} />
                  </button>
                ))}

                {searchQuery && !isSearching && searchResults.length === 0 && (
                   <div className={cn("text-center py-12 border border-dashed font-serif italic", isDarkMode ? "border-zinc-800 text-zinc-800" : "border-editorial-border text-editorial-text/40")}>
                     {(t('library.noResultsFor') || 'Geen resultaten voor "{query}".').replace('{query}', searchQuery)}
                   </div>
                )}

                <div className="pt-6 text-center">
                  <button 
                    onClick={skipSearch}
                    className={cn("text-[10px] font-bold uppercase tracking-[0.2em] transition-colors italic", isDarkMode ? "text-zinc-800 hover:text-zinc-600" : "text-editorial-text/40 hover:text-editorial-accent")}
                  >
                    {t('library.manualEntry') || 'Handmatig invoeren →'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-12 gap-10">
                 <div className="col-span-4 space-y-4">
                    <div className={cn("aspect-[2/3] rounded-none border overflow-hidden relative shadow-md", isDarkMode ? "bg-black border-zinc-800" : "bg-neutral-100 border-editorial-border")}>
                      {formData.coverUrl ? (
                        <img src={formData.coverUrl} alt="Preview" className={cn("w-full h-full object-cover", isDarkMode ? "opacity-70" : "")} referrerPolicy="no-referrer" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300 p-6 text-center">
                           <BookIcon size={32} className="mb-2 opacity-20" />
                           <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">{t('library.noCover') || 'Geen Cover'}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className={cn("text-[9px] font-bold uppercase tracking-[0.2em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.coverUrl') || 'Cover URL'}</label>
                      <input 
                        type="text" 
                        value={formData.coverUrl}
                        onChange={(e) => setFormData({...formData, coverUrl: e.target.value})}
                        className={cn(
                          "w-full px-3 py-2 rounded-none border text-[10px] focus:outline-none focus:border-editorial-accent transition-colors",
                          isDarkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-800" : "bg-white border-editorial-border text-editorial-text"
                        )}
                        placeholder="https://..."
                      />
                    </div>
                 </div>

                 <div className="col-span-8 space-y-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className={cn("text-[9px] font-bold uppercase tracking-[0.2em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.titleLabel') || 'Titel *'}</label>
                        <input 
                          required
                          type="text" 
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          className={cn(
                            "w-full px-4 py-3 rounded-none border focus:outline-none focus:border-editorial-accent transition-colors text-base font-serif italic",
                            isDarkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-800" : "bg-white border-editorial-border text-editorial-text"
                          )}
                          placeholder="Project Hail Mary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={cn("text-[9px] font-bold uppercase tracking-[0.2em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.authorsLabel') || 'Auteurs *'}</label>
                        <input 
                          required
                          type="text" 
                          value={authorsInput}
                          onChange={(e) => setAuthorsInput(e.target.value)}
                          className={cn(
                            "w-full px-4 py-3 rounded-none border focus:outline-none focus:border-editorial-accent transition-colors text-sm",
                            isDarkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-800" : "bg-white border-editorial-border text-editorial-text"
                          )}
                          placeholder={language === 'nl' ? 'Bijv. Andy Weir' : 'e.g. Andy Weir'}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={cn("text-[9px] font-bold uppercase tracking-[0.2em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.seriesLabel') || 'Serie'}</label>
                          <input 
                            type="text" 
                            value={formData.series || ''}
                            onChange={(e) => setFormData({...formData, series: e.target.value})}
                            className={cn(
                              "w-full px-4 py-3 rounded-none border focus:outline-none focus:border-editorial-accent transition-colors text-xs",
                              isDarkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-800" : "bg-white border-editorial-border text-editorial-text"
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className={cn("text-[9px] font-bold uppercase tracking-[0.2em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.volumeLabel') || 'Deel #'}</label>
                          <input 
                            type="number" 
                            value={formData.seriesIndex || ''}
                            onChange={(e) => setFormData({...formData, seriesIndex: parseInt(e.target.value)})}
                            className={cn(
                              "w-full px-4 py-3 rounded-none border focus:outline-none focus:border-editorial-accent transition-colors text-xs",
                              isDarkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-800" : "bg-white border-editorial-border text-editorial-text"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              <div className={cn("grid grid-cols-2 gap-12 pt-8 border-t", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
                <div className="space-y-6">
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-editorial-accent italic">{t('library.bibliographic') || 'Bibliografisch'}</h5>
                  <div className="space-y-2">
                    <label className={cn("text-[9px] font-bold uppercase tracking-[0.15em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.isbn') || 'ISBN'}</label>
                    <input 
                      type="text" 
                      value={formData.isbn || ''}
                      onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                      className={cn(
                        "w-full px-4 py-2 rounded-none border text-xs focus:outline-none focus:border-editorial-accent transition-colors",
                        isDarkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-editorial-border"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={cn("text-[9px] font-bold uppercase tracking-[0.15em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.genre') || 'Genre'}</label>
                    <input 
                      type="text" 
                      value={genresInput}
                      onChange={(e) => setGenresInput(e.target.value)}
                      className={cn(
                        "w-full px-4 py-2 rounded-none border text-xs focus:outline-none focus:border-editorial-accent transition-colors",
                        isDarkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-editorial-border"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-editorial-accent italic">{t('library.statusAndScale') || 'Status & Omvang'}</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={cn("text-[9px] font-bold uppercase tracking-[0.15em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.readingStatus') || 'Status'}</label>
                      <select 
                        value={formData.readingStatus}
                        onChange={(e) => setFormData({...formData, readingStatus: e.target.value as any})}
                        className={cn(
                          "w-full px-4 py-2 rounded-none border text-xs focus:outline-none focus:border-editorial-accent appearance-none cursor-pointer transition-colors",
                          isDarkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-editorial-border"
                        )}
                      >
                        <option value="Ongelezen">{translateStatus('Ongelezen', language)}</option>
                        <option value="Bezig">{translateStatus('Bezig', language)}</option>
                        <option value="Gelezen">{translateStatus('Gelezen', language)}</option>
                        <option value="Wil ik lezen">{translateStatus('Wil ik lezen', language)}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className={cn("text-[9px] font-bold uppercase tracking-[0.15em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.pages') || 'Pagina\'s'}</label>
                      <input 
                        type="number" 
                        value={formData.pageCount || ''}
                        onChange={(e) => setFormData({...formData, pageCount: parseInt(e.target.value)})}
                        className={cn(
                          "w-full px-4 py-2 rounded-none border text-xs focus:outline-none focus:border-editorial-accent transition-colors",
                          isDarkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-800" : "bg-white border-editorial-border"
                        )}
                        placeholder={(language === 'nl' ? 'bijv. 350' : 'e.g. 350')}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={cn("text-[9px] font-bold uppercase tracking-[0.15em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.myRating') || 'Mijn Waardering'}</label>
                    <div className="flex gap-2">
                       {[1, 2, 3, 4, 5].map(star => (
                         <button 
                           key={star}
                           type="button"
                           onClick={() => setFormData({...formData, rating: star})}
                           className={cn(
                             "text-lg transition-colors",
                             (formData.rating || 0) >= star ? "text-editorial-accent" : (isDarkMode ? "text-zinc-800 hover:text-zinc-700" : "text-neutral-200 hover:text-neutral-400")
                           )}
                         >
                           ★
                         </button>
                       ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn("space-y-6 pt-8 border-t", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
                <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-editorial-accent italic">{t('library.fileAndStorage') || 'Bestand & Opslag'}</h5>
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-3 space-y-2">
                    <label className={cn("text-[9px] font-bold uppercase tracking-[0.15em] px-1 italic flex items-center gap-2", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}><FileType size={10} /> {t('library.format') || 'Formaat'}</label>
                    <select 
                      value={formData.format}
                      onChange={(e) => setFormData({...formData, format: e.target.value})}
                      className={cn(
                        "w-full px-4 py-2 rounded-none border text-xs focus:outline-none focus:border-editorial-accent appearance-none cursor-pointer transition-colors",
                        isDarkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-editorial-border"
                      )}
                    >
                      <option>epub</option>
                      <option>pdf</option>
                      <option>mobi</option>
                      <option value="fysiek">{language === 'nl' ? 'fysiek' : 'physical'}</option>
                      <option value="overig">{language === 'nl' ? 'overig' : 'other'}</option>
                    </select>
                  </div>
                  <div className="col-span-9 space-y-2">
                    <label className={cn("text-[9px] font-bold uppercase tracking-[0.15em] px-1 italic flex items-center gap-2", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}><Link size={10} /> {t('library.storageLink') || 'Opslaglink'}</label>
                    <input 
                      type="text" 
                      value={formData.storageUrl || ''}
                      onChange={(e) => setFormData({...formData, storageUrl: e.target.value})}
                      className={cn(
                        "w-full px-4 py-2 rounded-none border text-xs focus:outline-none focus:border-editorial-accent transition-colors",
                        isDarkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-800" : "bg-white border-editorial-border"
                      )}
                      placeholder="https://nas.local/e-books/..."
                    />
                  </div>
                </div>
              </div>

                {error && (
                  <div className={cn("px-4 py-3 border text-xs font-bold uppercase tracking-widest mb-6 italic", isDarkMode ? "bg-red-950/20 border-red-900 text-red-500" : "bg-red-50 border-red-200 text-red-700")}>
                    {error}
                  </div>
                )}

                <div className={cn("flex items-center justify-between pt-10 border-t bg-transparent pb-4", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
                  <button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => setStep('search')}
                    className={cn("text-[10px] font-bold uppercase tracking-[0.15em] transition-colors italic disabled:opacity-50", isDarkMode ? "text-zinc-800 hover:text-zinc-600" : "text-editorial-text/40 hover:text-editorial-text")}
                  >
                    {t('library.backToSearch') || '← Metadata Zoeken'}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "px-10 py-4 rounded-none text-[10px] font-bold uppercase tracking-[0.25em] transition-colors shadow-lg disabled:bg-neutral-400 flex items-center gap-3",
                      isDarkMode ? "bg-white text-zinc-900 hover:bg-neutral-200" : "bg-editorial-text text-white hover:bg-neutral-800"
                    )}
                  >
                    {isSubmitting && <Loader2 size={14} className="animate-spin text-white" />}
                    {isSubmitting ? (t('library.saving') || "Bezig...") : (t('library.addBook') || "Boek Toevoegen")}
                  </button>
                </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
