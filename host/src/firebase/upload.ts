import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './app';

/**
 * Uploads a locally-picked image (expo-image-picker's file:// / content:// uri)
 * to Firebase Storage and returns its public download URL. Storage rules
 * restrict writes under uploads/{uid}/... to that signed-in user -- see
 * /storage.rules at the repo root.
 */
export async function uploadImage(uid: string, kind: 'flyer' | 'logo', localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const path = `uploads/${uid}/${kind}-${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
