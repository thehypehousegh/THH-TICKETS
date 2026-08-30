export interface TicketType {
  id: string;
  label: string;
  code: string;
  price: number;
}

export interface EventRecord {
  id: string;
  hostUid: string;
  name: string;
  description: string;
  date: string;
  time: string;
  venueName: string;
  flyerUrl: string | null;
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
  person: string;
  createdAt: string;
  codes: CodeRecord[];
}

export interface CodeMatch {
  batch: BatchRecord;
  code: CodeRecord;
}
