import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

// How often to silently re-check verification status for a signed-in,
// not-yet-verified user, as a fallback for the focus-listener below (some
// browsers/mobile webviews don't fire a reliable focus event when a user
// switches back from their email app).
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
        // The ID token's emailVerified claim can be stale -- e.g. an
        // existing user who verified their email in a previous session, or
        // on another device, without ever refreshing this one. One reload()
        // right after sign-in picks that up automatically instead of
        // requiring a manual "I've verified" click.
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

  // While signed in and not yet verified, automatically re-check on window
  // focus (the common case: verify in another tab/the email app, then come
  // back) and on a slower background interval as a fallback -- so
  // "I've verified" almost never needs to be clicked by hand.
  const refreshRef = useRef(refreshEmailVerified);
  refreshRef.current = refreshEmailVerified;
  useEffect(() => {
    if (!user || emailVerified) return;
    const onFocus = () => { refreshRef.current(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const interval = setInterval(onFocus, VERIFY_POLL_MS);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      clearInterval(interval);
    };
  }, [user, emailVerified]);

  const signUp = useCallback(async (email: string, password: string, name: string, contact: string, logoFile?: File | null) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    try {
      await sendEmailVerification(cred.user);
    } catch (err) {
      // Don't let a verification-email hiccup block account creation --
      // the "verify your email" banner's own resend button covers retrying.
      console.error('[signUp] sendEmailVerification failed:', err);
    }
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
