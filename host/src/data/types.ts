export interface OrganizerProfile {
  uid: string;
  name: string;
  contact: string;
  logoUrl: string | null;
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

export interface EventRecord {
  id: string;
  hostUid: string;
  name: string;
  description: string;
  date: string;
  time: string;
  venueName: string;
  venuePin: VenuePin | null;
  flyerUrl: string | null;
  abbr: string;
  salt: string;
  thhFirst: boolean;
  ticketTypes: TicketType[];
  ussdShortCode: string | null;
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
  ticketTypeId: string;
  quantity: number;
  amount: number;
  paystackRef: string;
  status: PurchaseStatus;
  batchId: string | null;
  createdAt: string;
}

export interface NewEventInput {
  name: string;
  description: string;
  date: string;
  time: string;
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
