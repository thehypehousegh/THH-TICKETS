import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { PermissionStatus } from 'expo-modules-core';

function sanitize(s: string) {
  return s.replace(/[^A-Za-z0-9_-]/g, '-');
}

function writeQrPngFile(base64: string, code: string): File {
  const file = new File(Paths.cache, `qr-${sanitize(code)}.png`);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });
  return file;
}

export async function shareQrPng(base64: string, code: string): Promise<void> {
  const file = writeQrPngFile(base64, code);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: code });
  }
}

export async function saveQrToPhotos(base64: string, code: string): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== PermissionStatus.GRANTED) return false;
  const file = writeQrPngFile(base64, code);
  await MediaLibrary.Asset.create(file.uri);
  return true;
}
