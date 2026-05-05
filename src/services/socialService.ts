import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  documentId,
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  or
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { UserProfile } from './userService';

export interface Follow {
  id?: string;
  followerId: string;
  followingId: string;
  createdAt: any;
}

export interface Activity {
  id?: string;
  userId: string;
  userName: string;
  userPhoto: string;
  type: 'START_READING' | 'FINISH_READING' | 'RATE_BOOK';
  bookId: string;
  bookTitle: string;
  bookCover?: string;
  rating?: number;
  review?: string;
  createdAt: any;
}

export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: any;
  bookId?: string;
  bookTitle?: string;
  storageUrl?: string;
}

export const socialService = {
  // --- Following ---
  async followUser(currentUserId: string, targetUserId: string) {
    try {
      const batch = writeBatch(db);
      
      const followRef = doc(collection(db, 'follows'));
      batch.set(followRef, {
        followerId: currentUserId,
        followingId: targetUserId,
        createdAt: serverTimestamp()
      });

      // ONLY update the current user's followingCount
      // We also update updatedAt to satisfy strict rule key checks if they exist
      const currentUserRef = doc(db, 'users', currentUserId);
      batch.update(currentUserRef, { 
        followingCount: increment(1),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'follows');
    }
  },

  async unfollowUser(currentUserId: string, targetUserId: string) {
    try {
      const q = query(
        collection(db, 'follows'), 
        where('followerId', '==', currentUserId), 
        where('followingId', '==', targetUserId)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));

        // ONLY update the current user's followingCount
        const currentUserRef = doc(db, 'users', currentUserId);
        batch.update(currentUserRef, { 
          followingCount: increment(-1),
          updatedAt: serverTimestamp()
        });

        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'follows');
    }
  },

  async getFollowCounts(userId: string) {
    try {
      const followingQ = query(collection(db, 'follows'), where('followerId', '==', userId));
      const followersQ = query(collection(db, 'follows'), where('followingId', '==', userId));
      
      const [followingSnap, followersSnap] = await Promise.all([
        getDocs(followingQ),
        getDocs(followersQ)
      ]);

      return {
        following: followingSnap.size,
        followers: followersSnap.size
      };
    } catch (error) {
      console.error('Error fetching follow counts:', error);
      return { following: 0, followers: 0 };
    }
  },

  async getFollowing(userId: string): Promise<string[]> {
    try {
      const q = query(collection(db, 'follows'), where('followerId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => (d.data() as Follow).followingId);
    } catch (error) {
      console.error('Error fetching following list:', error);
      return [];
    }
  },

  async getFollowingProfiles(userId: string): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, 'follows'), where('followerId', '==', userId));
      const snapshot = await getDocs(q);
      const followingIds = snapshot.docs.map(d => (d.data() as Follow).followingId);
      
      if (followingIds.length === 0) return [];
      
      const usersQ = query(collection(db, 'users'), where(documentId(), 'in', followingIds));
      const usersSnap = await getDocs(usersQ);
      return usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
    } catch (error) {
      console.error('Error fetching following profiles:', error);
      return [];
    }
  },

  async getFollowers(userId: string): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, 'follows'), where('followingId', '==', userId));
      const snapshot = await getDocs(q);
      const followerIds = snapshot.docs.map(d => (d.data() as Follow).followerId);
      
      if (followerIds.length === 0) return [];
      
      // Fetch user profiles for these IDs using documentId()
      const usersQ = query(collection(db, 'users'), where(documentId(), 'in', followerIds));
      const usersSnap = await getDocs(usersQ);
      return usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
    } catch (error) {
      console.error('Error fetching followers profiles:', error);
      return [];
    }
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const q = query(
      collection(db, 'follows'), 
      where('followerId', '==', followerId), 
      where('followingId', '==', followingId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  // --- Activities ---
  async logActivity(activity: Omit<Activity, 'id' | 'createdAt'>) {
    try {
      await addDoc(collection(db, 'activities'), {
        ...activity,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'activities');
    }
  },

  getActivities(callback: (activities: Activity[]) => void) {
    const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
      callback(activities);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'activities'));
  },

  async deleteActivity(activityId: string) {
    try {
      await deleteDoc(doc(db, 'activities', activityId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `activities/${activityId}`);
    }
  },

  // --- Messaging ---
  async sendMessage(senderId: string, receiverId: string, text: string, bookData?: { bookId: string, bookTitle: string, storageUrl: string }) {
    try {
      await addDoc(collection(db, 'messages'), {
        senderId,
        receiverId,
        text,
        ...(bookData || {}),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }
  },

  getMessages(currentUserId: string, otherUserId: string, callback: (messages: Message[]) => void) {
    // SECURITY: Only fetch messages involving BOTH users to strictly match security rules and improve performance
    // We use the OR filter which matches the allow list rules
    const q = query(
      collection(db, 'messages'), 
      or(
        where('senderId', '==', currentUserId),
        where('receiverId', '==', currentUserId)
      ),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      // Further filter in client to specific conversation with otherUserId
      const messages = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Message))
        .filter(m => 
          (m.senderId === currentUserId && m.receiverId === otherUserId) || 
          (m.senderId === otherUserId && m.receiverId === currentUserId)
        );
      callback(messages);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'messages'));
  },

  async deleteMessage(messageId: string) {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${messageId}`);
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
      return [];
    }
  }
};
