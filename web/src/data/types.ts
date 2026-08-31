export interface PayoutDetails {
  method: 'momo' | 'bank';
  network: string; // e.g. MTN, Vodafone, AirtelTigo -- momo only
  phone: string; // momo only
  bankName: string; // bank only
  accountName: string; // bank only
  accountNumber: string; // bank only
}

export interface OrganizerProfile {
  uid: string;
  name: string;
  contact: string;
  logoUrl: string | null;
  payout: PayoutDetails | null;
  /** Never set from any app -- only ever toggled by hand in the Firestore
   * console. See README.md's "Super-admin access" section. */
  isAdmin?: boolean;
  createdAt: string;
}

export interface TicketType {
  id: string;
  label: string;
  code: string;
  price: number;
}

export interface VenuePin {
  lat: number;
  lng: number;
}

export type EventStatus = 'draft' | 'published' | 'ended';

export interface EventRecord {
  id: string;
  hostUid: string;
  name: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  venueName: string;
  venuePin: VenuePin | null;
  flyerUrl: string | null;
  abbr: string;
  salt: string;
  thhFirst: boolean;
  ticketTypes: TicketType[];
  ussdShortCode: string | null;
  status: EventStatus;
  createdAt: string;
}

export interface CodeRecord {
  id: string;
  code: string;
  type: string;
  usedAt: string | null;
  usedBy: string | null;
}

export interface BatchRecord {
  id: string;
  eventId: string;
  person: string;
  contact: string;
  email: string;
  source: 'manual' | 'online';
  createdAt: string;
  codes: CodeRecord[];
}

export type PurchaseRequestStatus = 'pending' | 'paid' | 'failed';

export interface PurchaseRequestItem {
  ticketTypeId: string;
  label: string;
  code: string;
  price: number;
  quantity: number;
}

/**
 * Submitted by the public checkout page on this site, before payment is
 * wired up (task #53). Kept as its own top-level collection (rather than
 * reusing PurchaseRecord from the mobile apps' types.ts) because it needs to
 * be writable by a signed-out buyer -- see the purchaseRequests rules block
 * in /firestore.rules. Once Paystack verification lands, a Cloud Function
 * (Admin SDK, bypasses these rules) will read a 'paid' request and issue the
 * matching codes/batch, same shape as generateCodes() below but source:'online'.
 */
export interface PurchaseRequest {
  id: string;
  eventId: string;
  hostUid: string;
  buyerName: string;
  buyerContact: string;
  buyerEmail: string;
  items: PurchaseRequestItem[];
  discountCode: string | null;
  amount: number;
  status: PurchaseRequestStatus;
  createdAt: string;
}

export type DiscountKind = 'earlybird' | 'special' | 'group' | 'combo' | 'other';
export type DiscountValueType = 'percent' | 'flat';

export interface DiscountRecord {
  id: string;
  eventId: string;
  code: string;
  kind: DiscountKind;
  valueType: DiscountValueType;
  value: number; // percent (0-100) or a flat GHS amount, per valueType
  ticketTypeIds: string[]; // empty = applies to every ticket type on the event
  active: boolean;
  /** YYYY-MM-DD, or null for a discount that never expires. Valid through
   * the end of this date. A code past its expiry no longer applies, even if
   * `active` is still true -- expiry is a separate, automatic cutoff. */
  expiresAt: string | null;
  /** Whether to surface this discount's promo blurb on the public event
   * page, near ticket pricing. The code itself still works either way --
   * this only controls whether non-holders are told about it. */
  showPublicly: boolean;
  /** Free text the organizer writes for the public promo blurb, e.g. "Early
   * bird -- 20% off, first 50 tickets only". Only shown when showPublicly is
   * true; a blank value falls back to an auto-generated line. */
  publicInfo: string | null;
  createdAt: string;
}

export interface NewEventInput {
  name: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  venueName: string;
  venuePin: VenuePin | null;
  flyerUrl: string | null;
  abbr: string;
  thhFirst: boolean;
  ticketTypes: { label: string; code: string; price: number }[];
}

export interface TicketSelection {
  typeLabel: string;
  typeCode: string;
  quantity: number;
}

export type SupportThreadStatus = 'open' | 'resolved';

/** A help-desk conversation between one organizer and the admin -- either
 * general (eventId null) or scoped to one of that organizer's events, e.g.
 * started from that event's Manage page. */
export interface SupportThread {
  id: string;
  organizerUid: string;
  organizerName: string;
  eventId: string | null;
  eventName: string | null;
  status: SupportThreadStatus;
  lastMessageAt: string;
  lastMessagePreview: string;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  senderUid: string;
  senderRole: 'organizer' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
}
