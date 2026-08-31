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
  /** Never set from the app -- only ever toggled by hand in the Firestore
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

export type PurchaseStatus = 'pending' | 'paid' | 'failed';

export interface PurchaseRecord {
  id: string;
  eventId: string;
  buyerName: string;
  buyerContact: string;
  buyerEmail: string;
  ticketTypeId: string;
  quantity: number;
  amount: number;
  discountCode: string | null;
  paystackRef: string;
  status: PurchaseStatus;
  batchId: string | null;
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
