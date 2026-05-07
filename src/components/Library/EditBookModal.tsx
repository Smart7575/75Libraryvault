import React, { useState } from 'react';
import { X, Book as BookIcon, Loader2, Link, FileType } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Book, bookService } from '../../services/bookService';
import { socialService } from '../../services/socialService';
import { auth } from '../../lib/firebase';
import { useLanguage } from '../../lib/LanguageContext';
import { translateStatus } from '../../translations';

interface EditBookModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onBookUpdated: () => void;
  isDarkMode?: boolean;
}

export default function EditBookModal({ book, isOpen, onClose, onBookUpdated, isDarkMode }: EditBookModalProps) {
  const { t, language } = useLanguage();
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

    // Handle status transitions
    if (cleanData.readingStatus === 'Bezig' && book.readingStatus !== 'Bezig' && !book.startDate) {
      cleanData.startDate = new Date().toISOString();
    }
    if (cleanData.readingStatus === 'Gelezen' && book.readingStatus !== 'Gelezen' && !book.endDate) {
      cleanData.endDate = new Date().toISOString();
      
      // Calculate stats if finishing
      const startDateStr = cleanData.startDate || book.startDate;
      if (startDateStr && book.pageCount) {
         const end = new Date();
         const start = new Date(startDateStr);
         const diffTime = Math.abs(end.getTime() - start.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
         cleanData.readingDuration = diffDays;
         cleanData.pagesPerDay = parseFloat((book.pageCount / diffDays).toFixed(1));
      }
    }

    try {
      await bookService.updateBook(book.id!, cleanData);
      
      // Log activity if rating or notes (review) changed
      if (auth.currentUser && (cleanData.rating !== book.rating || cleanData.notes !== book.notes)) {
        if (cleanData.rating) {
           await socialService.logActivity({
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName || (language === 'nl' ? 'Gebruiker' : 'User'),
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
        setError(`${t('common.error') || 'Fout'}: ${firestoreError.error}`);
      } catch {
        setError(t('library.updateFailed') || 'Het boek kon niet worden bijgewerkt.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn("fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm", isDarkMode ? "bg-black/60" : "bg-black/40")}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "w-full max-w-2xl rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border transition-colors",
          isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border"
        )}
      >
        <div className={cn("p-6 border-b flex items-center justify-between transition-colors", isDarkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-editorial-border text-editorial-text")}>
          <h2 className="text-xl font-serif italic tracking-tight font-bold">{t('library.editBook') || 'Boek Bewerken'}</h2>
          <button onClick={onClose} className="p-2 hover:text-editorial-accent transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className={cn("flex-1 overflow-y-auto p-10 transition-colors", isDarkMode ? "bg-zinc-950" : "bg-editorial-bg/30")}>
          <form onSubmit={handleSubmit} className="space-y-10">
            {error && (
              <div className={cn("px-4 py-3 border text-xs font-bold uppercase tracking-widest italic", isDarkMode ? "bg-red-950/20 border-red-900 text-red-500" : "bg-red-50 border-red-200 text-red-700")}>
                {error}
              </div>
            )}

            <div className="grid grid-cols-12 gap-10">
               <div className="col-span-4 space-y-4">
                  <div className={cn("aspect-[2/3] rounded-none border overflow-hidden relative shadow-md", isDarkMode ? "bg-black border-zinc-800" : "bg-neutral-100 border-editorial-border")}>
                    {formData.coverUrl ? (
                      <img src={formData.coverUrl} alt="Preview" className={cn("w-full h-full object-cover", isDarkMode ? "opacity-70" : "")} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300 p-6 text-center">
                         <BookIcon size={32} className="mb-2 opacity-20" />
                         <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Geen Cover</span>
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
                        placeholder={language === 'nl' ? 'bijv. 350' : 'e.g. 350'}
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
                  />
                </div>
              </div>
            </div>

            <div className={cn("space-y-6 pt-8 border-t", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
              <label className={cn("text-[9px] font-bold uppercase tracking-[0.15em] px-1 italic", isDarkMode ? "text-zinc-800" : "text-editorial-text/40")}>{t('library.notes') || 'Notities'}</label>
              <textarea 
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className={cn(
                  "w-full px-4 py-3 rounded-none border text-sm focus:outline-none focus:border-editorial-accent min-h-[120px] font-serif italic transition-colors",
                  isDarkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-800" : "bg-white border-editorial-border text-black"
                )}
                placeholder={t('library.notesPlaceholder') || "Schrijf hier je gedachten over dit boek..."}
              />
            </div>

            <div className={cn("flex items-center justify-end pt-10 border-t bg-transparent pb-4", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
              <button 
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "px-12 py-4 rounded-none text-[10px] font-bold uppercase tracking-[0.25em] transition-colors shadow-lg disabled:bg-neutral-400 flex items-center gap-3",
                  isDarkMode ? "bg-white text-zinc-900 hover:bg-neutral-200" : "bg-editorial-text text-white hover:bg-neutral-800"
                )}
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin text-white" />}
                {isSubmitting ? (t('library.saving') || "Bezig...") : (t('library.saveChanges') || "Wijzigingen Opslaan")}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
