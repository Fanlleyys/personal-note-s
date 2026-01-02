import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';

// Firebase configuration - Replace with your own config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth Providers
const googleProvider = new GoogleAuthProvider();

// Auth Functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Event Types
export interface CalendarEvent {
  id?: string;
  title: string;
  date: Date;
  description?: string;
  reminder?: boolean;
  userId: string;
  createdAt?: Date;
}

// Password Types
export interface PasswordEntry {
  id?: string;
  title: string;
  username?: string;
  encryptedPassword: string;
  category?: string;
  notes?: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Events Collection Functions
export const addEvent = async (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'events'), {
      ...event,
      date: Timestamp.fromDate(event.date),
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding event:', error);
    throw error;
  }
};

export const updateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.date) {
      updateData.date = Timestamp.fromDate(updates.date);
    }
    await updateDoc(eventRef, updateData);
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

export const deleteEvent = async (eventId: string) => {
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

export const subscribeToEvents = (
  userId: string,
  callback: (events: CalendarEvent[]) => void
) => {
  const q = query(
    collection(db, 'events'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const events: CalendarEvent[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(),
      createdAt: doc.data().createdAt?.toDate()
    })) as CalendarEvent[];
    // Sort on client-side to avoid index requirement
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    callback(events);
  });
};

// Passwords Collection Functions
export const addPassword = async (password: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'passwords'), {
      ...password,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding password:', error);
    throw error;
  }
};

export const updatePassword = async (passwordId: string, updates: Partial<PasswordEntry>) => {
  try {
    const passwordRef = doc(db, 'passwords', passwordId);
    await updateDoc(passwordRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

export const deletePassword = async (passwordId: string) => {
  try {
    await deleteDoc(doc(db, 'passwords', passwordId));
  } catch (error) {
    console.error('Error deleting password:', error);
    throw error;
  }
};

export const subscribeToPasswords = (
  userId: string,
  callback: (passwords: PasswordEntry[]) => void
) => {
  const q = query(
    collection(db, 'passwords'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const passwords: PasswordEntry[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as PasswordEntry[];
    // Sort on client-side to avoid index requirement
    passwords.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    callback(passwords);
  });
};

export const getPasswordsBySearch = async (userId: string, searchTerm: string) => {
  try {
    const q = query(
      collection(db, 'passwords'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const passwords: PasswordEntry[] = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as PasswordEntry[];

    // Filter by search term (case-insensitive)
    const lowerSearch = searchTerm.toLowerCase();
    return passwords.filter(p =>
      p.title.toLowerCase().includes(lowerSearch) ||
      p.username?.toLowerCase().includes(lowerSearch) ||
      p.category?.toLowerCase().includes(lowerSearch)
    );
  } catch (error) {
    console.error('Error searching passwords:', error);
    throw error;
  }
};
