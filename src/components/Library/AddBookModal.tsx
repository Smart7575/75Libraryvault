import React, { useState } from 'react';
import { X, Search, Globe, Book as BookIcon, ChevronRight, Check, Loader2, Link, FileType } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { metadataService, ExternalBook } from '../../services/metadataService';
import { Book, bookService } from '../../services/bookService';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: () => void;
}

export default function AddBookModal({ isOpen, onClose, onBookAdded }: AddBookModalProps) {
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
      setError('Zoeken mislukt. Probeer het later opnieuw.');
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
    if (!cleanData.isbn) delete cleanData.isbn;
    if (!cleanData.storageUrl) delete cleanData.storageUrl;

    console.log('Adding book with data:', cleanData);

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
        setError(`Fout: ${firestoreError.error}`);
      } catch {
        setError('Het boek kon niet worden toegevoegd. Controleer de velden.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-editorial-border"
      >
        <div className="p-6 border-b border-editorial-border flex items-center justify-between bg-white text-editorial-text">
          <h2 className="text-xl font-serif italic tracking-tight font-bold">Nieuw Boek Toevoegen</h2>
          <button onClick={onClose} className="p-2 hover:text-editorial-accent transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-editorial-bg/30">
          {step === 'search' ? (
            <div className="space-y-10">
              <div className="text-center max-w-md mx-auto">
                <p className="text-editorial-text/50 mb-8 font-serif italic">Zoek een boek om metadata automatisch op te halen.</p>
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-editorial-text/30" size={18} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Titel, auteur of ISBN..."
                    className="w-full pl-12 pr-28 py-4 rounded-none border border-editorial-border focus:border-editorial-text focus:outline-none transition-all text-base bg-white"
                    autoFocus
                  />
                  <button 
                    disabled={isSearching}
                    className="absolute right-1 top-1 bottom-1 bg-editorial-text text-white px-6 rounded-none text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 disabled:bg-neutral-200 transition-colors"
                  >
                    {isSearching ? <Loader2 size={16} className="animate-spin text-white" /> : "Zoek"}
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                {searchResults.map((result, idx) => (
                  <button 
                    key={idx}
                    onClick={() => selectBook(result)}
                    className="w-full text-left p-4 rounded-none border border-editorial-border bg-white hover:border-editorial-text transition-all flex items-center gap-6 group"
                  >
                    <div className="w-16 h-24 bg-neutral-100 rounded-none overflow-hidden shadow-sm flex-shrink-0 border border-black/5">
                      {result.coverUrl ? (
                         <img src={result.coverUrl} alt={result.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-neutral-300">
                           <BookIcon size={20} />
                         </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs uppercase tracking-tight group-hover:text-editorial-accent transition-colors truncate">{result.title}</h4>
                      <p className="text-xs italic text-editorial-text/50 mt-1">{result.authors.join(', ')}</p>
                      <div className="mt-3 flex items-center gap-4">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-editorial-text/30 flex items-center gap-1.5 italic">
                           <Globe size={10} /> {result.source}
                         </span>
                         {result.publishedDate && (
                           <span className="text-[9px] font-bold uppercase tracking-widest text-editorial-text/30 italic">
                             {result.publishedDate.split('-')[0]}
                           </span>
                         )}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-neutral-200 group-hover:text-editorial-text transition-colors" />
                  </button>
                ))}

                {searchQuery && !isSearching && searchResults.length === 0 && (
                   <div className="text-center py-12 border border-dashed border-editorial-border font-serif italic text-editorial-text/40">
                     Geen resultaten voor "{searchQuery}".
                   </div>
                )}

                <div className="pt-6 text-center">
                  <button 
                    onClick={skipSearch}
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-text/40 hover:text-editorial-accent transition-colors italic"
                  >
                    Handmatig invoeren →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-12 gap-10">
                 <div className="col-span-4 space-y-4">
                    <div className="aspect-[2/3] bg-neutral-100 rounded-none border border-editorial-border overflow-hidden relative shadow-md">
                      {formData.coverUrl ? (
                        <img src={formData.coverUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300 p-6 text-center">
                           <BookIcon size={32} className="mb-2 opacity-20" />
                           <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Geen Cover</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.2em] px-1 italic">Cover URL</label>
                      <input 
                        type="text" 
                        value={formData.coverUrl}
                        onChange={(e) => setFormData({...formData, coverUrl: e.target.value})}
                        className="w-full px-3 py-2 rounded-none border border-editorial-border text-[10px] focus:outline-none focus:border-editorial-text bg-white"
                        placeholder="https://..."
                      />
                    </div>
                 </div>

                 <div className="col-span-8 space-y-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.2em] px-1 italic">Titel *</label>
                        <input 
                          required
                          type="text" 
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          className="w-full px-4 py-3 rounded-none border border-editorial-border focus:outline-none focus:border-editorial-text bg-white text-base font-serif italic"
                          placeholder="Project Hail Mary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.2em] px-1 italic">Auteurs *</label>
                        <input 
                          required
                          type="text" 
                          value={authorsInput}
                          onChange={(e) => setAuthorsInput(e.target.value)}
                          className="w-full px-4 py-3 rounded-none border border-editorial-border focus:outline-none focus:border-editorial-text bg-white text-sm"
                          placeholder="Bijv. Andy Weir"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.2em] px-1 italic">Serie</label>
                          <input 
                            type="text" 
                            value={formData.series || ''}
                            onChange={(e) => setFormData({...formData, series: e.target.value})}
                            className="w-full px-4 py-3 rounded-none border border-editorial-border focus:outline-none focus:border-editorial-text bg-white text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.2em] px-1 italic">Deel #</label>
                          <input 
                            type="number" 
                            value={formData.seriesIndex || ''}
                            onChange={(e) => setFormData({...formData, seriesIndex: parseInt(e.target.value)})}
                            className="w-full px-4 py-3 rounded-none border border-editorial-border focus:outline-none focus:border-editorial-text bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-12 pt-8 border-t border-editorial-border">
                <div className="space-y-6">
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-editorial-accent italic">Bibliografisch</h5>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.15em] px-1 italic">ISBN</label>
                    <input 
                      type="text" 
                      value={formData.isbn || ''}
                      onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                      className="w-full px-4 py-2 rounded-none border border-editorial-border text-xs focus:outline-none focus:border-editorial-text bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.15em] px-1 italic">Genre</label>
                    <input 
                      type="text" 
                      value={genresInput}
                      onChange={(e) => setGenresInput(e.target.value)}
                      className="w-full px-4 py-2 rounded-none border border-editorial-border text-xs focus:outline-none focus:border-editorial-text bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-editorial-accent italic">Status & Omvang</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.15em] px-1 italic">Status</label>
                      <select 
                        value={formData.readingStatus}
                        onChange={(e) => setFormData({...formData, readingStatus: e.target.value as any})}
                        className="w-full px-4 py-2 rounded-none border border-editorial-border text-xs focus:outline-none focus:border-editorial-text bg-white appearance-none cursor-pointer"
                      >
                        <option>Ongelezen</option>
                        <option>Bezig</option>
                        <option>Gelezen</option>
                        <option>Wil ik lezen</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.15em] px-1 italic">Pagina's</label>
                      <input 
                        type="number" 
                        value={formData.pageCount || ''}
                        onChange={(e) => setFormData({...formData, pageCount: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 rounded-none border border-editorial-border text-xs focus:outline-none focus:border-editorial-text bg-white"
                        placeholder="bijv. 350"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.15em] px-1 italic">Mijn Waardering</label>
                    <div className="flex gap-2">
                       {[1, 2, 3, 4, 5].map(star => (
                         <button 
                           key={star}
                           type="button"
                           onClick={() => setFormData({...formData, rating: star})}
                           className={cn(
                             "text-lg transition-colors",
                             (formData.rating || 0) >= star ? "text-editorial-accent" : "text-neutral-200 hover:text-neutral-400"
                           )}
                         >
                           ★
                         </button>
                       ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-8 border-t border-editorial-border">
                <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-editorial-accent italic">Bestand & Opslag</h5>
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-3 space-y-2">
                    <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.15em] px-1 italic flex items-center gap-2"><FileType size={10} /> Formaat</label>
                    <select 
                      value={formData.format}
                      onChange={(e) => setFormData({...formData, format: e.target.value})}
                      className="w-full px-4 py-2 rounded-none border border-editorial-border text-xs focus:outline-none focus:border-editorial-text bg-white appearance-none cursor-pointer"
                    >
                      <option>epub</option>
                      <option>pdf</option>
                      <option>mobi</option>
                      <option>fysiek</option>
                      <option>overig</option>
                    </select>
                  </div>
                  <div className="col-span-9 space-y-2">
                    <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.15em] px-1 italic flex items-center gap-2"><Link size={10} /> Opslaglink</label>
                    <input 
                      type="text" 
                      value={formData.storageUrl || ''}
                      onChange={(e) => setFormData({...formData, storageUrl: e.target.value})}
                      className="w-full px-4 py-2 rounded-none border border-editorial-border text-xs focus:outline-none focus:border-editorial-text bg-white"
                      placeholder="https://nas.local/e-books/..."
                    />
                  </div>
                </div>
              </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-widest mb-6 italic">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between pt-10 border-t border-editorial-border bg-transparent pb-4">
                  <button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => setStep('search')}
                    className="text-[10px] font-bold uppercase tracking-[0.15em] text-editorial-text/40 hover:text-editorial-text transition-colors italic disabled:opacity-50"
                  >
                    ← Metadata Zoeken
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-editorial-text text-white px-10 py-4 rounded-none text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-neutral-800 transition-colors shadow-lg disabled:bg-neutral-400 flex items-center gap-3"
                  >
                    {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                    {isSubmitting ? "Bezig..." : "Boek Toevoegen"}
                  </button>
                </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
