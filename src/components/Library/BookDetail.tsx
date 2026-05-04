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
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { Book, bookService } from '../../services/bookService';
import { userService } from '../../services/userService';
import { socialService } from '../../services/socialService';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import EditBookModal from './EditBookModal';

interface BookDetailProps {
  book: Book;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BookDetail({ book, onClose, onUpdate }: BookDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
      setError('Kopiëren mislukt.');
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
          userName: auth.currentUser.displayName || 'Gebruiker',
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
          userName: auth.currentUser.displayName || 'Gebruiker',
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
    if (confirm('Weet je zeker dat je dit boek wilt verwijderen?')) {
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
          setError(`Verwijderen mislukt: ${firestoreError.error}`);
        } catch {
          setError('Boek kon niet worden verwijderd.');
        }
        setIsDeleting(false);
      }
    }
  };

  const getPlatformIcon = (url: string) => {
    if (url.includes('onedrive')) return 'OneDrive';
    if (url.includes('google')) return 'Google Drive';
    if (url.includes('dropbox')) return 'Dropbox';
    return 'Opslag';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-5xl rounded-none shadow-2xl overflow-hidden flex h-[85vh] max-h-[850px] border border-editorial-border"
      >
        {/* Cover Section */}
        <div className="w-[350px] bg-editorial-bg flex items-center justify-center relative group border-r border-editorial-border">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover grayscale-[0.1]" referrerPolicy="no-referrer" />
          ) : (
            <div className="text-black/10 text-center p-12 italic font-serif">
              <span className="text-9xl font-black opacity-10">{book.title.substring(0, 1)}</span>
            </div>
          )}
          <div className="absolute top-8 left-8">
             <button onClick={onClose} className="bg-white border border-editorial-border p-3 rounded-none shadow-lg hover:text-editorial-accent transition-all">
                <ChevronLeft size={20} />
             </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 overflow-y-auto bg-white p-16 flex flex-col font-sans">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-xs font-bold uppercase tracking-widest italic">
              {error}
            </div>
          )}
          <div className="flex justify-between items-start mb-10 pb-8 border-b border-editorial-border">
            <div className="flex-1">
               <div className="flex items-center gap-4 mb-4">
                 <span className={cn(
                   "px-4 py-1 border border-current text-[9px] font-bold uppercase tracking-[0.2em] italic",
                   book.readingStatus === 'Gelezen' ? "text-green-700 bg-green-50/50" :
                   book.readingStatus === 'Bezig' ? "text-blue-700 bg-blue-50/50" :
                   book.readingStatus === 'Wil ik lezen' ? "text-orange-700 bg-orange-50/50" :
                   "text-black/30 bg-neutral-50"
                 )}>
                   {book.readingStatus}
                 </span>
                 {book.series && (
                   <span className="text-editorial-text/40 text-[10px] font-bold uppercase tracking-[0.15em] italic">
                     {book.series} / Vol. {book.seriesIndex}
                   </span>
                 )}
               </div>
               <h1 className="text-5xl font-serif font-black tracking-tight leading-[0.9] text-editorial-text mb-4 italic italic-bold">{book.title}</h1>
               <p className="text-xl text-editorial-text/50 font-serif italic">{book.authors.join(', ')}</p>
            </div>
            <div className="flex gap-4">
              {isOwner ? (
                <>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-3 border border-editorial-border text-editorial-text/30 hover:text-editorial-text hover:border-editorial-text transition-all"
                  >
                    <Edit3 size={20} />
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-3 border border-editorial-border text-editorial-text/30 hover:text-red-600 hover:border-red-600 transition-all"
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
                      : "bg-editorial-accent text-white hover:bg-neutral-800"
                  )}
                >
                  {copySuccess ? <Check size={14} /> : <BookOpen size={14} />}
                  {copySuccess ? 'Toegevoegd aan collectie' : 'Kopieer naar mijn collectie'}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 mb-12 items-center justify-between">
            <div className="flex text-editorial-accent text-xl">
              {isOwner || (book.rating && book.rating > 0) ? (
                [1, 2, 3, 4, 5].map((s) => (
                  <Star 
                    key={s} 
                    size={24} 
                    className={cn(
                      "transition-colors",
                      book.rating && s <= book.rating ? "fill-editorial-accent" : "text-neutral-100"
                    )} 
                  />
                ))
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/20 italic">Geen waardering</span>
              )}
            </div>

            <div className="flex gap-3">
              {isOwner && (book.readingStatus === 'Ongelezen' || book.readingStatus === 'Wil ik lezen') ? (
                <button 
                  onClick={handleStartReading}
                  disabled={isBusy}
                  className="bg-editorial-text text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center gap-2"
                >
                  <BookOpen size={14} /> Start met lezen
                </button>
              ) : isOwner && book.readingStatus === 'Bezig' ? (
                <button 
                  onClick={handleFinishReading}
                  disabled={isBusy}
                  className="bg-green-700 text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-green-800 transition-all flex items-center gap-2"
                >
                  <Check size={14} /> Markeer als uitgelezen
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-16 mb-16">
            <div className="space-y-8">
              <DetailItem icon={<Info size={14} />} label="ISBN" value={book.isbn || 'N/A'} />
              <DetailItem icon={<Calendar size={14} />} label="Editie / Datum" value={book.publishedDate || 'N/A'} />
              <DetailItem icon={<Tag size={14} />} label="Categorisatie" value={book.genre.join(', ') || 'N/A'} />
            </div>
            <div className="space-y-8">
              <DetailItem icon={<Clock size={14} />} label="Gearchiveerd op" value={book.dateAdded ? format(book.dateAdded.toDate(), 'd MMMM yyyy', { locale: nl }) : '-'} />
              {book.readingStatus === 'Gelezen' && book.endDate && (
                <div className="pt-4 border-t border-editorial-border space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-black/40 italic">Leestijd</span>
                    <span className="text-sm font-bold">{book.readingDuration} dagen</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-black/40 italic">Gemiddelde</span>
                    <span className="text-sm font-bold">{book.pagesPerDay} pag/dag</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 pt-4">
                 <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.2em] italic">Digitale Toegang</label>
                 {book.storageUrl ? (
                   <a 
                    href={book.storageUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-3 bg-editorial-text text-white px-6 py-4 rounded-none text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-neutral-800 transition-all w-fit"
                   >
                     <ExternalLink size={14} />
                     Open in {getPlatformIcon(book.storageUrl)}
                   </a>
                 ) : (
                   <span className="text-[10px] font-bold uppercase tracking-widest text-black/20 italic">Geen digitale link</span>
                 )}
              </div>
            </div>
          </div>

          <div className="space-y-4 flex-1">
             <label className="text-[9px] font-bold uppercase text-editorial-text/40 tracking-[0.2em] italic">
               {isOwner ? 'Persoonlijke Annotaties' : `Beschrijving`}
             </label>
             <div className="bg-editorial-bg/50 p-10 border border-editorial-border min-h-[180px] text-editorial-text/70 leading-relaxed font-serif italic text-lg whitespace-pre-wrap">
               {isOwner ? (book.notes || 'Er zijn nog geen notities voor dit exemplaar.') : (book.description || 'Geen beschrijving beschikbaar.')}
             </div>
          </div>

          <div className="mt-16 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-text/30 pt-8 border-t border-editorial-border italic">
             <div className="flex items-center gap-3">
               <Smartphone size={14} /> Mobiele Toegang
             </div>
             <span>Ref: {book.id?.substring(0, 8)}</span>
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
        />
      )}
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col gap-2">
       <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest flex items-center gap-2">
          {icon}
          {label}
       </label>
       <p className="text-sm font-bold text-zinc-900">{value}</p>
    </div>
  );
}
