import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

const KEY = 'verifier-ticket-view';

/**
 * Blocks screenshots and screen recording (blocked outright on iOS 13+ and
 * Android, not just detected) for as long as `shouldProtect` is true — used to
 * stop a door-verifier device from capturing a QR code or code text it's only
 * meant to view for check-in, not distribute.
 */
export function useScreenCaptureGuard(shouldProtect: boolean) {
  useEffect(() => {
    if (!shouldProtect) return;
    ScreenCapture.preventScreenCaptureAsync(KEY);
    return () => {
      ScreenCapture.allowScreenCaptureAsync(KEY);
    };
  }, [shouldProtect]);
}
