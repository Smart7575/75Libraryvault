import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  getDocFromServer,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export interface Book {
  id?: string;
  userId: string;
  title: string;
  authors: string[];
  series?: string;
  seriesIndex?: number;
  isbn?: string;
  language?: string;
  genre: string[];
  publishedDate?: string;
  description?: string;
  coverUrl?: string;
  format?: string;
  storageUrl?: string;
  rating?: number;
  readingStatus: 'Ongelezen' | 'Bezig' | 'Gelezen' | 'Wil ik lezen';
  dateAdded: any;
  dateRead?: any;
  startDate?: any;
  endDate?: any;
  pageCount?: number;
  readingDuration?: number;
  pagesPerDay?: number;
  summary?: string;
  notes?: string;
  updatedAt?: any;
}

const COLLECTION_NAME = 'books';

function sanitizeData(data: any) {
  const result = { ...data };
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}

export const bookService = {
  async getAllBooks() {
    const user = auth.currentUser;
    if (!user) return [];
    
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', user.uid),
        orderBy('dateAdded', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  },

  async getBooksByUserId(userId: string) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('dateAdded', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  },

  async addBook(book: Omit<Book, 'id' | 'userId' | 'dateAdded' | 'updatedAt'>) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      const newBook = sanitizeData({
        ...book,
        userId: user.uid,
        dateAdded: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newBook);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  async updateBook(id: string, updates: Partial<Book>) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const sanitizedUpdates = sanitizeData({
        ...updates,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(docRef, sanitizedUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async deleteBook(id: string) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async getPopularBooks() {
    try {
      // Group by title and count
      const q = query(
        collection(db, COLLECTION_NAME),
        where('readingStatus', '==', 'Bezig'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      const books = snapshot.docs.map(doc => doc.data() as Book);
      
      const counts: { [key: string]: { title: string, count: number, authors: string[] } } = {};
      
      books.forEach(book => {
        const key = book.title.toLowerCase().trim();
        if (counts[key]) {
          counts[key].count++;
        } else {
          counts[key] = { 
            title: book.title, 
            count: 1, 
            authors: book.authors || [] 
          };
        }
      });
      
      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    } catch (error) {
      console.error('Error fetching popular books:', error);
      return [];
    }
  },

  async copyBook(book: Book) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      const { 
        id, 
        userId, 
        dateAdded, 
        updatedAt, 
        rating, 
        storageUrl, 
        notes, 
        readingStatus, 
        dateRead,
        startDate,
        endDate,
        readingDuration,
        pagesPerDay,
        ...bookData 
      } = book;

      const newBook = sanitizeData({
        ...bookData,
        userId: user.uid,
        readingStatus: 'Wil ik lezen' as const,
        dateAdded: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newBook);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  async addSharedBook(bookSnippet: any, sharedStorageUrl?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      const effectiveStorageUrl = sharedStorageUrl || bookSnippet?.storageUrl || '';
      
      const newBook = sanitizeData({
        ...bookSnippet,
        userId: user.uid,
        storageUrl: effectiveStorageUrl,
        readingStatus: 'Wil ik lezen' as const,
        dateAdded: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newBook);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  onBooksUpdate(callback: (books: Book[]) => void) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', user.uid),
      orderBy('dateAdded', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
      callback(books);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    });
  }
};
