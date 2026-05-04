import React, { useState } from 'react';
import { X, Book as BookIcon, Loader2, Link, FileType } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Book, bookService } from '../../services/bookService';
import { socialService } from '../../services/socialService';
import { auth } from '../../lib/firebase';

interface EditBookModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onBookUpdated: () => void;
}

export default function EditBookModal({ book, isOpen, onClose, onBookUpdated }: EditBookModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use local string state for potentially multi-word/comma fields to avoid space issues during typing
  const [authorsInput, setAuthorsInput] = useState(book.authors?.join(', ') || '');
  const [genresInput, setGenresInput] = useState(book.genre?.join(', ') || '');
  
  const [formData, setFormData] = useState<Partial<Book>>({
    ...book
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Sanitize data
    const cleanData = { ...formData };
    delete cleanData.id;
    delete cleanData.userId;
    delete cleanData.dateAdded;
    delete cleanData.updatedAt;
    
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

    if (!cleanData.series) cleanData.series = '';
    if (!cleanData.isbn) cleanData.isbn = '';
    if (!cleanData.storageUrl) cleanData.storageUrl = '';

    try {
      await bookService.updateBook(book.id!, cleanData);
      
      // Log activity if rating or notes (review) changed
      if (auth.currentUser && (cleanData.rating !== book.rating || cleanData.notes !== book.notes)) {
        if (cleanData.rating) {
           await socialService.logActivity({
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName || 'Gebruiker',
            userPhoto: auth.currentUser.photoURL || '',
            type: 'RATE_BOOK',
            bookId: book.id!,
            bookTitle: book.title,
            bookCover: book.coverUrl,
            rating: cleanData.rating,
            review: cleanData.notes
          });
        }
      }

      onBookUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to update book:', err);
      try {
        const firestoreError = JSON.parse(err.message);
        setError(`Fout: ${firestoreError.error}`);
      } catch {
        setError('Het boek kon niet worden bijgewerkt.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-2xl rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-editorial-border"
      >
        <div className="p-6 border-b border-editorial-border flex items-center justify-between bg-white text-editorial-text">
          <h2 className="text-xl font-serif italic tracking-tight font-bold">Boek Bewerken</h2>
          <button onClick={onClose} className="p-2 hover:text-editorial-accent transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-editorial-bg/30">
          <form onSubmit={handleSubmit} className="space-y-10">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-none text-xs font-bold uppercase tracking-widest italic">
                {error}
              </div>
            )}

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
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-8 border-t border-editorial-border">
              <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.15em] px-1 italic">Notities</label>
              <textarea 
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-4 py-3 rounded-none border border-editorial-border text-sm focus:outline-none focus:border-editorial-text bg-white min-h-[120px] font-serif italic"
                placeholder="Schrijf hier je gedachten over dit boek..."
              />
            </div>

            <div className="flex items-center justify-end pt-10 border-t border-editorial-border bg-transparent pb-4">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-editorial-text text-white px-12 py-4 rounded-none text-[10px] font-bold uppercase tracking-[0.25em] hover:bg-neutral-800 transition-colors shadow-lg disabled:bg-neutral-400 flex items-center gap-3"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                {isSubmitting ? "Bezig..." : "Wijzigingen Opslaan"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
