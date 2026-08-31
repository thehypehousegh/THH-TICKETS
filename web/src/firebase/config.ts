// Firebase project config for THH Ticket Codes. This value is safe to commit
// even in a public repo — Firebase's security model is enforced by Firestore
// security rules (see /firestore.rules at the repo root), not by keeping this
// object secret. Every one of these fields is meant to be visible to anyone
// who has the app installed; they identify the project, they don't grant
// access to it on their own.
//
// Replace the placeholder values below with the ones shown after registering
// a Web app in your Firebase project (Project settings -> Your apps -> the
// </> icon). The verifier app (../../verifier/src/firebase/config.ts) and the
// host app (../../host/src/firebase/config.ts) must use this exact same
// project so all three apps read/write the same data.
export const firebaseConfig = {
  apiKey: 'AIzaSyBjSNZbQrDMCSfTo0DA30cdIAM2YhuW2rQ',
  authDomain: 'thh-tickets.firebaseapp.com',
  projectId: 'thh-tickets',
  storageBucket: 'thh-tickets.firebasestorage.app',
  messagingSenderId: '346806544306',
  appId: '1:346806544306:web:82d8712ad7fba3e655e6ab',
};
