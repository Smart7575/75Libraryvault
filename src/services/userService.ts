import { 
  doc, 
  getDoc, 
  setDoc,
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  birthDate?: string;
  city?: string;
  country?: string;
  facebook?: string;
  instagram?: string;
  readingGoal?: number;
  favoriteBookId?: string;
  currentBookId?: string;
  theme?: 'light' | 'dark';
  followerCount?: number;
  followingCount?: number;
  updatedAt?: any;
}

const COLLECTION_NAME = 'users';
export const ADMIN_EMAIL = 'smartinali75@gmail.com';

export const userService = {
  isAdmin(email?: string | null): boolean {
    if (!email) return false;
    return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  },

  async getProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { uid: snapshot.id, ...snapshot.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${uid}`);
      return null;
    }
  },

  async updateProfile(uid: string, updates: Partial<UserProfile>) {
    try {
      const docRef = doc(db, COLLECTION_NAME, uid);
      // Remove uid from updates if it exists to avoid saving it as a field
      const { uid: _, ...dataToSave } = updates;
      
      await setDoc(docRef, {
        ...dataToSave,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${uid}`);
    }
  },

  async deleteUser(uid: string) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${uid}`);
    }
  }
};
