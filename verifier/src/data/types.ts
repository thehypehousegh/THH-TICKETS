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
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  venueName: string;
  flyerUrl: string | null;
  status: 'draft' | 'published' | 'ended';
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
  contact: string;
  email: string;
  createdAt: string;
  source: 'manual' | 'online';
  codes: CodeRecord[];
}

export interface CodeMatch {
  batch: BatchRecord;
  code: CodeRecord;
}
