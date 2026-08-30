// The event's Firestore document ID doubles as its public "join code" --
// short and typeable on purpose, since a verifier phone (a separate, unlogged-in
// app) enters it by hand to connect to this exact event's live data. Anyone who
// has it can read that event and check tickets in for it (see /firestore.rules
// at the repo root) -- same trust model the local host-code system used to
// have, just now the credential is the address of the data itself rather than
// a separately-checked PIN.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L, easy to read aloud

export function generateJoinCode(length = 7): string {
  let s = '';
  for (let i = 0; i < length; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
