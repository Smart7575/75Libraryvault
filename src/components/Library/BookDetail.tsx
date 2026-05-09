import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Link as LinkIcon, 
  Calendar, 
  Tag, 
  Info,
  Clock,
  Star,
  MapPin,
  ChevronLeft,
  Smartphone,
  BookOpen,
  Check,
  Send,
  ArrowUpCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { Book, bookService } from '../../services/bookService';
import { userService } from '../../services/userService';
import { socialService } from '../../services/socialService';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import EditBookModal from './EditBookModal';
import ShareBookModal from './ShareBookModal';
import PushBookModal from './PushBookModal';
import { useLanguage } from '../../lib/LanguageContext';
import { translateStatus } from '../../translations';

interface BookDetailProps {
  book: Book;
  onClose: () => void;
  onUpdate: () => void;
  isDarkMode?: boolean;
}

export default function BookDetail({ book, onClose, onUpdate, isDarkMode }: BookDetailProps) {
  const { t, language } = useLanguage();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const isOwner = auth.currentUser?.uid === book.userId;

  const handleCopy = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await bookService.copyBook(book);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
      onUpdate(); // To refresh user's book count etc if needed
    } catch (err: any) {
      console.error('Copy book error:', err);
      setError(t('library.copyFailed') || 'Kopiëren mislukt.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleStartReading = async () => {
    if (!isOwner) return;
    setIsBusy(true);
    try {
      await bookService.updateBook(book.id!, {
        readingStatus: 'Bezig',
        startDate: new Date().toISOString()
      });
      if (auth.currentUser) {
        await userService.updateProfile(auth.currentUser.uid, { currentBookId: book.id });

        // Log activity
        await socialService.logActivity({
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || (t('common.user') || 'User'),
          userPhoto: auth.currentUser.photoURL || '',
          type: 'START_READING',
          bookId: book.id!,
          bookTitle: book.title,
          bookCover: book.coverUrl
        });
      }
      onUpdate();
    } catch (err) {
      console.error('Start reading error:', err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFinishReading = async () => {
    setIsBusy(true);
    const endDate = new Date();
    const startDate = book.startDate ? new Date(book.startDate) : (book.dateAdded?.toDate() || new Date());
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    let pagesPerDay = 0;
    if (book.pageCount) {
      pagesPerDay = book.pageCount / diffDays;
    }

    try {
      await bookService.updateBook(book.id!, {
        readingStatus: 'Gelezen',
        endDate: endDate.toISOString(),
        readingDuration: diffDays,
        ...(book.pageCount ? { pagesPerDay: parseFloat(pagesPerDay.toFixed(1)) } : {})
      });
      
      if (auth.currentUser) {
        const profile = await userService.getProfile(auth.currentUser.uid);
        if (profile?.currentBookId === book.id) {
          await userService.updateProfile(auth.currentUser.uid, { currentBookId: '' });
        }

        // Log activity
        await socialService.logActivity({
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || (t('common.user') || 'User'),
          userPhoto: auth.currentUser.photoURL || '',
          type: 'FINISH_READING',
          bookId: book.id!,
          bookTitle: book.title,
          bookCover: book.coverUrl
        });
      }
      onUpdate();
    } catch (err) {
      console.error('Finish reading error:', err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(t('library.deleteConfirm') || 'Weet je zeker dat je dit boek wilt verwijderen?')) {
      setIsDeleting(true);
      setError(null);
      try {
        await bookService.deleteBook(book.id!);
        onUpdate();
        onClose();
      } catch (err: any) {
        console.error('Delete error:', err);
        try {
          const firestoreError = JSON.parse(err.message);
          setError(`${t('library.deleteFailed') || 'Verwijderen mislukt:'} ${firestoreError.error}`);
        } catch {
          setError(t('library.bookNotFound') || 'Boek kon niet worden verwijderd.');
        }
        setIsDeleting(false);
      }
    }
  };

  const getPlatformIcon = (url: string) => {
    if (url.includes('onedrive')) return 'OneDrive';
    if (url.includes('google')) return 'Google Drive';
    if (url.includes('dropbox')) return 'Dropbox';
    return t('library.storage') || 'Opslag';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "w-full max-w-5xl rounded-none shadow-2xl overflow-hidden flex h-[85vh] max-h-[850px] border transition-colors",
          isDarkMode ? "bg-zinc-900 border-zinc-800 text-neutral-100" : "bg-white border-editorial-border text-editorial-text"
        )}
      >
        {/* Cover Section */}
        <div className={cn(
          "w-[350px] flex items-center justify-center relative group border-r transition-colors",
          isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-editorial-bg border-editorial-border"
        )}>
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className={cn("w-full h-full object-cover", isDarkMode ? "opacity-70" : "grayscale-[0.1]")} referrerPolicy="no-referrer" />
          ) : (
            <div className={cn("text-center p-12 italic font-serif", isDarkMode ? "text-white/5" : "text-black/10")}>
              <span className="text-9xl font-black opacity-10">{book.title.substring(0, 1)}</span>
            </div>
          )}
          <div className="absolute top-8 left-8">
             <button 
              onClick={onClose} 
              className={cn(
                "border p-3 rounded-none shadow-lg transition-all",
                isDarkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-editorial-accent" : "bg-white border-editorial-border text-editorial-text hover:text-editorial-accent"
              )}
             >
                <ChevronLeft size={20} />
             </button>
          </div>
        </div>

        {/* Info Section */}
        <div className={cn(
          "flex-1 overflow-y-auto p-16 flex flex-col font-sans transition-colors",
          isDarkMode ? "bg-zinc-900" : "bg-white"
        )}>
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-xs font-bold uppercase tracking-widest italic">
              {error}
            </div>
          )}
          <div className={cn("flex justify-between items-start mb-10 pb-8 border-b", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
            <div className="flex-1">
               <div className="flex items-center gap-4 mb-4">
                 <span className={cn(
                   "px-4 py-1 border border-current text-[9px] font-bold uppercase tracking-[0.2em] italic",
                   book.readingStatus === 'Gelezen' ? (isDarkMode ? "text-green-500 bg-green-500/10" : "text-green-700 bg-green-50/50") :
                   book.readingStatus === 'Bezig' ? (isDarkMode ? "text-blue-500 bg-blue-500/10" : "text-blue-700 bg-blue-50/50") :
                   book.readingStatus === 'Wil ik lezen' ? (isDarkMode ? "text-orange-500 bg-orange-500/10" : "text-orange-700 bg-orange-50/50") :
                   (isDarkMode ? "text-zinc-600 border-zinc-800" : "text-black/30 bg-neutral-50")
                 )}>
                   {translateStatus(book.readingStatus, language)}
                 </span>
                 {book.series && (
                   <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em] italic", isDarkMode ? "text-zinc-500" : "text-editorial-text/40")}>
                     {book.series} / Vol. {book.seriesIndex}
                   </span>
                 )}
               </div>
               <h1 className={cn("text-5xl font-serif font-black tracking-tight leading-[0.9] mb-4 italic italic-bold", isDarkMode ? "text-neutral-100" : "text-editorial-text")}>{book.title}</h1>
               <p className={cn("text-xl font-serif italic", isDarkMode ? "text-zinc-500" : "text-editorial-text/50")}>{book.authors.join(', ')}</p>
            </div>
            <div className="flex gap-4">
              {isOwner ? (
                <>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className={cn(
                      "p-3 border transition-all",
                      isDarkMode ? "border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-400" : "border-editorial-border text-editorial-text/30 hover:text-editorial-text hover:border-editorial-text"
                    )}
                    title={t('library.editTooltip') || "Bewerken"}
                  >
                    <Edit3 size={20} />
                  </button>
                  <button 
                    onClick={() => setIsPushModalOpen(true)}
                    className={cn(
                      "p-3 border transition-all",
                      isDarkMode ? "border-zinc-800 text-zinc-500 hover:text-editorial-accent-bright hover:border-editorial-accent-bright" : "border-editorial-border text-editorial-text/30 hover:text-editorial-accent hover:border-editorial-accent"
                    )}
                    title={t('library.pushTooltip') || "Push naar volger"}
                  >
                    <ArrowUpCircle size={20} />
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={cn(
                      "p-3 border transition-all",
                      isDarkMode ? "border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-500" : "border-editorial-border text-editorial-text/30 hover:text-red-600 hover:border-red-600"
                    )}
                    title={t('library.deleteTooltip') || "Verwijderen"}
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleCopy}
                  disabled={isBusy || copySuccess}
                  className={cn(
                    "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl",
                    copySuccess 
                      ? "bg-green-600 text-white" 
                      : (isDarkMode ? "bg-editorial-accent text-white hover:bg-zinc-100 hover:text-zinc-900" : "bg-editorial-accent text-white hover:bg-neutral-800")
                  )}
                >
                  {copySuccess ? <Check size={14} /> : <BookOpen size={14} />}
                  {copySuccess ? (t('library.addedToCollection') || 'Toegevoegd aan collectie') : (t('library.copyToCollection') || 'Kopieer naar mijn collectie')}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 mb-12 items-center justify-between">
            <div className={cn("flex text-xl gap-0.5", isDarkMode ? "text-white" : "text-editorial-accent")}>
              {isOwner || (book.rating && book.rating > 0) ? (
                [1, 2, 3, 4, 5].map((s) => {
                  const isFilled = book.rating && s <= book.rating;
                  return (
                    <Star 
                      key={s} 
                      size={24} 
                      strokeWidth={isFilled ? 1.5 : 2}
                      className={cn(
                        "transition-colors",
                        isFilled ? (isDarkMode ? "fill-editorial-accent-bright" : "fill-current") : "fill-transparent"
                      )} 
                    />
                  );
                })
              ) : (
                <span className={cn("text-[10px] font-bold uppercase tracking-widest italic", isDarkMode ? "text-zinc-700" : "text-black/20")}>{t('library.noRating') || 'Geen waardering'}</span>
              )}
            </div>

            <div className="flex gap-3">
              {isOwner && (book.readingStatus === 'Ongelezen' || book.readingStatus === 'Wil ik lezen') ? (
                <button 
                  onClick={handleStartReading}
                  disabled={isBusy}
                  className="bg-editorial-text text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center gap-2"
                >
                  <BookOpen size={14} /> {t('library.startReading') || 'Start met lezen'}
                </button>
              ) : isOwner && book.readingStatus === 'Bezig' ? (
                <button 
                  onClick={handleFinishReading}
                  disabled={isBusy}
                  className="bg-green-700 text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-green-800 transition-all flex items-center gap-2"
                >
                  <Check size={14} /> {t('library.finishReading') || 'Markeer als uitgelezen'}
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-16 mb-16">
            <div className="space-y-8">
              <DetailItem icon={<Info size={14} />} label={t('library.isbn') || "ISBN"} value={book.isbn || 'N/A'} isDarkMode={isDarkMode} />
              <DetailItem icon={<Calendar size={14} />} label={t('library.editionDate') || "Editie / Datum"} value={book.publishedDate || 'N/A'} isDarkMode={isDarkMode} />
              <DetailItem icon={<Tag size={14} />} label={t('library.categorization') || "Categorisatie"} value={book.genre.join(', ') || 'N/A'} isDarkMode={isDarkMode} />
            </div>
            <div className="space-y-8">
              <DetailItem icon={<Clock size={14} />} label={t('library.archivedOn') || "Gearchiveerd op"} value={book.dateAdded ? format(book.dateAdded.toDate(), 'd MMMM yyyy', { locale: language === 'nl' ? nl : enUS }) : '-'} isDarkMode={isDarkMode} />
              {book.readingStatus === 'Gelezen' && book.endDate && (
                <div className={cn("pt-4 border-t space-y-4", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
                  <div className="flex justify-between items-center">
                    <span className={cn("text-[10px] font-bold uppercase italic", isDarkMode ? "text-zinc-500" : "text-black/40")}>{t('library.readingTime') || 'Leestijd'}</span>
                    <span className="text-sm font-bold">{book.readingDuration} {t('library.days') || 'dagen'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={cn("text-[10px] font-bold uppercase italic", isDarkMode ? "text-zinc-500" : "text-black/40")}>{t('library.average') || 'Gemiddelde'}</span>
                    <span className="text-sm font-bold">{book.pagesPerDay} {t('library.pagesPerDayLabel') || 'pag/dag'}</span>
                  </div>
                </div>
              )}                  <div className="flex items-center gap-3 pt-4">
                  <div className="flex flex-col gap-3">
                    <label className={cn("text-[9px] font-bold uppercase tracking-[0.2em] italic", isDarkMode ? "text-zinc-500" : "text-editorial-text/40")}>{t('library.digitalAccess') || 'Digitale Toegang'}</label>
                    {book.storageUrl ? (
                      <div className="flex gap-4 items-center">
                        <a 
                          href={book.storageUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className={cn(
                            "inline-flex items-center gap-3 px-6 py-4 rounded-none text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl transition-all w-fit",
                            isDarkMode ? "bg-zinc-100 text-zinc-900 hover:bg-neutral-200" : "bg-editorial-text text-white hover:bg-neutral-800"
                          )}
                        >
                          <ExternalLink size={14} />
                          {t('library.openIn') || 'Open in'} {getPlatformIcon(book.storageUrl)}
                        </a>
                        {isOwner && (
                          <button 
                            onClick={() => setIsShareModalOpen(true)}
                            className={cn(
                              "border p-4 transition-all shadow-md flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest",
                              isDarkMode ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-editorial-accent hover:border-editorial-accent" : "bg-white border-editorial-border text-editorial-text hover:text-editorial-accent hover:border-editorial-accent"
                            )}
                            title={t('library.shareTooltip') || "Deel locatie via chat"}
                          >
                            <Send size={14} />
                            {t('library.share') || 'Deel'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest italic", isDarkMode ? "text-zinc-700" : "text-black/20")}>{t('library.noDigitalLink') || 'Geen digitale link'}</span>
                    )}
                  </div>
                 </div>
            </div>
          </div>

          {book.summary && (
            <div className="space-y-4 mb-12">
               <label className={cn("text-[9px] font-bold uppercase tracking-[0.2em] italic", isDarkMode ? "text-zinc-500" : "text-editorial-text/40")}>
                 {t('library.summary') || 'Samenvatting'}
               </label>
               <div className={cn(
                 "p-10 border leading-relaxed font-serif italic text-lg transition-colors border-dashed",
                 isDarkMode ? "bg-zinc-950/20 border-zinc-800 text-zinc-300" : "bg-neutral-50/50 border-editorial-border text-editorial-text/80"
               )}>
                 {book.summary}
               </div>
            </div>
          )}

          <div className="space-y-4 flex-1">
             <label className={cn("text-[9px] font-bold uppercase tracking-[0.2em] italic", isDarkMode ? "text-zinc-500" : "text-editorial-text/40")}>
               {isOwner ? (t('library.personalNotes') || 'Persoonlijke Annotaties') : (t('library.description') || `Beschrijving`)}
             </label>
             <div className={cn(
               "p-10 border min-h-[180px] leading-relaxed font-serif italic text-lg whitespace-pre-wrap transition-colors",
               isDarkMode ? "bg-zinc-950/50 border-zinc-800 text-zinc-400" : "bg-editorial-bg/50 border-editorial-border text-editorial-text/70"
             )}>
               {isOwner ? (book.notes || (t('library.noNotes') || 'Er zijn nog geen notities voor dit exemplaar.')) : (book.description || (t('library.noDescription') || 'Geen beschrijving beschikbaar.'))}
             </div>
          </div>

          <div className={cn("mt-16 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] pt-8 border-t italic transition-colors", isDarkMode ? "text-zinc-700 border-zinc-800" : "text-editorial-text/30 border-editorial-border")}>
             <div className="flex items-center gap-3">
               <Smartphone size={14} /> {t('library.mobileAccess') || 'Mobiele Toegang'}
             </div>
             <span>{t('library.ref') || 'Ref'}: {book.id?.substring(0, 8)}</span>
          </div>
        </div>
      </motion.div>

      {isEditModalOpen && (
        <EditBookModal 
          book={book}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onBookUpdated={() => {
            onUpdate();
            // We don't close the detail here, but it will refresh thanks to onUpdate
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {isShareModalOpen && (
        <ShareBookModal 
          book={book}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}

      {isPushModalOpen && (
        <PushBookModal 
          book={book}
          isOpen={isPushModalOpen}
          onClose={() => setIsPushModalOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}

function DetailItem({ icon, label, value, isDarkMode }: { icon: React.ReactNode, label: string, value: string, isDarkMode?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
       <label className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-2", isDarkMode ? "text-zinc-600" : "text-zinc-400")}>
          {icon}
          {label}
       </label>
       <p className={cn("text-sm font-bold", isDarkMode ? "text-zinc-200" : "text-zinc-900")}>{value}</p>
    </div>
  );
}
