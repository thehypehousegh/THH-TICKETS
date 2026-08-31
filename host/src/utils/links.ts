// Base URL of THH Events, the public browse/purchase site (see /web at the
// repo root, deployed via Firebase Hosting -- run `firebase deploy --only
// hosting` from the repo root once you've `firebase login`ed). This is
// Firebase Hosting's default URL for the thh-tickets project; update it here
// if a custom domain is attached later.
export const PUBLIC_SITE_BASE_URL = 'https://thh-tickets.web.app';

export function publicEventUrl(eventId: string): string {
  return `${PUBLIC_SITE_BASE_URL}/e/${eventId}`;
}
