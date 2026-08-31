import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/app';
import { uploadImage } from '../firebase/upload';
import type { OrganizerProfile } from './types';

interface AuthContextValue {
  loading: boolean;
  user: User | null;
  organizer: OrganizerProfile | null;
  emailVerified: boolean;
  signUp: (email: string, password: string, name: string, contact: string, logoFile?: File | null) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateOrganizer: (patch: Partial<Pick<OrganizerProfile, 'name' | 'contact' | 'logoUrl' | 'payout'>>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshEmailVerified: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setEmailVerified(nextUser?.emailVerified ?? false);
      if (nextUser) {
        const snap = await getDoc(doc(db, 'organizers', nextUser.uid));
        setOrganizer(snap.exists() ? (snap.data() as OrganizerProfile) : null);
      } else {
        setOrganizer(null);
      }
      setLoading(false);
    });
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, contact: string, logoFile?: File | null) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    await sendEmailVerification(cred.user);
    const logoUrl = logoFile ? await uploadImage(cred.user.uid, 'logo', logoFile) : null;
    const profile: OrganizerProfile = {
      uid: cred.user.uid,
      name: name.trim(),
      contact: contact.trim(),
      logoUrl,
      payout: null,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'organizers', cred.user.uid), profile);
    setOrganizer(profile);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const updateOrganizer = useCallback(
    async (patch: Partial<Pick<OrganizerProfile, 'name' | 'contact' | 'logoUrl' | 'payout'>>) => {
      if (!user) return;
      await setDoc(doc(db, 'organizers', user.uid), patch, { merge: true });
      setOrganizer((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [user]
  );

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }, []);

  const refreshEmailVerified = useCallback(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setEmailVerified(auth.currentUser.emailVerified);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        organizer,
        emailVerified,
        signUp,
        signIn,
        signOut,
        updateOrganizer,
        resetPassword,
        resendVerificationEmail,
        refreshEmailVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
