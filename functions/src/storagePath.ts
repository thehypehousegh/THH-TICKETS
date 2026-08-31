// Firebase Storage download URLs look like:
// https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<url-encoded-path>?alt=media&token=...
export function extractStoragePath(downloadUrl: string | null | undefined): string | null {
  if (!downloadUrl) return null;
  const match = downloadUrl.match(/\/o\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
