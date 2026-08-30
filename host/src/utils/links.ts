// Base URL of the public purchase/preview site (see /web at the repo root,
// deployed via Firebase Hosting). Update this once that site is deployed --
// Firebase Hosting's default URL is https://<project-id>.web.app.
export const PUBLIC_SITE_BASE_URL = 'https://REPLACE_ME.web.app';

export function publicEventUrl(eventId: string): string {
  return `${PUBLIC_SITE_BASE_URL}/e/${eventId}`;
}
