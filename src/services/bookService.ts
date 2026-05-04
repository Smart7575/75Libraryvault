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
  getDocFromServer
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
  notes?: string;
  updatedAt?: any;
}

const COLLECTION_NAME = 'books';

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
      const newBook = {
        ...book,
        userId: user.uid,
        dateAdded: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newBook);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  async updateBook(id: string, updates: Partial<Book>) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
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
      // Fetch books that are currently being read by anyone
      const q = query(
        collection(db, COLLECTION_NAME),
        where('readingStatus', '==', 'Bezig'),
        limit(100) // Look at a sample of current reading activities
      );
      
      const snapshot = await getDocs(q);
      const books = snapshot.docs.map(doc => doc.data() as Book);
      
      // Group by title and count
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
      
      // Convert to array and sort
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
      // Create a copy of the book object excluding personal/private data
      const { 
        id, 
        userId, 
        dateAdded, 
        updatedAt, 
        rating, 
        storageUrl, 
        notes, 
        readingStatus, // We might want to reset this
        dateRead,
        startDate,
        endDate,
        readingDuration,
        pagesPerDay,
        ...bookData 
      } = book;

      const newBook = {
        ...bookData,
        userId: user.uid,
        readingStatus: 'Wil ik lezen' as const, // Default status for copied books
        dateAdded: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newBook);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  }
};
