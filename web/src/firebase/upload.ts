import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './app';

/**
 * Uploads a browser File (flyer image or organizer logo) to Firebase Storage
 * and returns its public download URL. Storage rules restrict writes under
 * uploads/{uid}/... to that signed-in user -- see /storage.rules.
 */
export async function uploadImage(uid: string, kind: 'flyer' | 'logo', file: File): Promise<string> {
  const path = `uploads/${uid}/${kind}-${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}
