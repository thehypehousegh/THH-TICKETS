import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * No login screen exists in this app on purpose -- every device just signs
 * in anonymously so Firestore's security rules can require SOME auth token
 * on writes without ever asking a verifier to create an account. A fresh
 * anonymous identity each install/reinstall is fine: it's only used to tag
 * which phone flipped a code's checked-in state, not to prove who the
 * person operating it is.
 */
export function ensureSignedIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) {
        resolve(user.uid);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user.uid))
          .catch(reject);
      }
    });
  });
}
