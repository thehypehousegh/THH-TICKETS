export interface TicketType {
  id: string;
  label: string;
  code: string;
}

export interface EventRecord {
  id: string;
  name: string;
  venue: string;
  date: string;
  time: string;
  description: string;
  abbr: string;
  salt: string;
  thhFirst: boolean;
  createdAt: string;
  hostKey: string;
  hostMasterKey: string;
  types: TicketType[];
}

export interface CodeRecord {
  id: string;
  code: string;
  type: string;
  usedAt: string | null;
}

export interface BatchRecord {
  id: string;
  eventId: string;
  person: string;
  createdAt: string;
  codes: CodeRecord[];
}

export interface NewEventInput {
  name: string;
  venue: string;
  date: string;
  time: string;
  description: string;
  abbr: string;
  thhFirst: boolean;
  types: { label: string; code: string }[];
}

export interface TicketSelection {
  typeLabel: string;
  typeCode: string;
  quantity: number;
}
