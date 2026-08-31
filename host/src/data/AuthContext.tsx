import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
  signUp: (email: string, password: string, name: string, contact: string, logoUri?: string | null) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateOrganizer: (patch: Partial<Pick<OrganizerProfile, 'name' | 'contact' | 'logoUrl' | 'payout'>>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshEmailVerified: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Fallback poll interval for verification status while the app-state
// listener below (the primary mechanism) is between foreground events.
const VERIFY_POLL_MS = 20000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        // Picks up an existing user who verified their email in a previous
        // session or on another device, without them ever tapping
        // "I've verified" on this one -- the cached token can otherwise
        // say unverified indefinitely.
        if (!nextUser.emailVerified) {
          try {
            await nextUser.reload();
          } catch {
            // Non-fatal -- fall back to the (possibly stale) cached value.
          }
        }
        setEmailVerified(auth.currentUser?.emailVerified ?? nextUser.emailVerified);
        const snap = await getDoc(doc(db, 'organizers', nextUser.uid));
        setOrganizer(snap.exists() ? (snap.data() as OrganizerProfile) : null);
      } else {
        setEmailVerified(false);
        setOrganizer(null);
      }
      setLoading(false);
    });
  }, []);

  const refreshEmailVerified = useCallback(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setEmailVerified(auth.currentUser.emailVerified);
  }, []);

  // While signed in and not yet verified, re-check automatically whenever
  // the app returns to the foreground (the common case: verify from the
  // device's email app, then switch back) plus a slower background poll as
  // a fallback -- so "I've verified" almost never needs to be tapped by hand.
  const refreshRef = useRef(refreshEmailVerified);
  refreshRef.current = refreshEmailVerified;
  useEffect(() => {
    if (!user || emailVerified) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshRef.current();
    });
    const interval = setInterval(() => refreshRef.current(), VERIFY_POLL_MS);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [user, emailVerified]);

  const signUp = useCallback(async (email: string, password: string, name: string, contact: string, logoUri?: string | null) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    try {
      await sendEmailVerification(cred.user);
    } catch (err) {
      console.error('[signUp] sendEmailVerification failed:', err);
    }
    const logoUrl = logoUri ? await uploadImage(cred.user.uid, 'logo', logoUri) : null;
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
    async (patch: Partial<Pick<OrganizerProfile, 'name' | 'contact' | 'logoUrl'>>) => {
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
