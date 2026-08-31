// Ticket code generation, ported from web/src/utils/codes.ts's makeCode so
// codes issued server-side (Paystack-verified purchases) look identical in
// shape to ones generated client-side (manual/comp codes) -- door staff and
// the verifier app can't tell the difference, nor should they need to.
const BRAND_PREFIX = 'THH';

function digits4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export interface EventLike {
  abbr: string;
  salt: string;
  thhFirst: boolean;
}

export function makeCode(e: EventLike, typeCode: string): string {
  const T = (typeCode || 'R').toUpperCase();
  return e.thhFirst
    ? [BRAND_PREFIX, e.salt, e.abbr, T + digits4()].join('-')
    : [e.abbr, BRAND_PREFIX, T + digits4(), digits4()].join('-');
}
