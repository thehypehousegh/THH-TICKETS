// `firebase/auth`'s published types always resolve to its platform-agnostic
// "auth-public.d.ts" (that file's "types" condition is listed unconditionally
// ahead of "react-native" in the package's exports map, so TypeScript never
// picks up the React Native build's types no matter what customConditions
// says). getReactNativePersistence is real at runtime -- Metro's bundler
// resolution does honor the "react-native" condition -- it's only missing
// from the types, so it's added back here via module augmentation.
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
