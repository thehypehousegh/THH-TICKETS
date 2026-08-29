// Ported 1:1 from project/Ticket Codes.dc.html's <script data-dc-script> logic,
// so generated codes and reservation message copy match the approved design
// exactly.

export const BRAND_PREFIX = 'THH';
export const SIGN_OFF = 'See you on';
export const SALT_LENGTH = 7;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const A36 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function salt(n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += A36[Math.floor(Math.random() * 36)];
  return s;
}

export function digits4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export interface EventLike {
  name: string;
  venue: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  abbr: string;
  salt: string;
  thhFirst: boolean;
}

export function when(e: Pick<EventLike, 'date' | 'time'>, withTime: boolean): string {
  if (!e.date) return '';
  const [y, m, d] = e.date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const short = DAYS[dt.getDay()] + ', ' + String(d).padStart(2, '0') + '-' + String(m).padStart(2, '0') + '-' + String(y).slice(2);
  if (!withTime || !e.time) return short;
  const [hh, mm] = e.time.split(':').map(Number);
  const h12 = ((hh + 11) % 12) + 1;
  return short + ' at ' + h12 + ':' + String(mm).padStart(2, '0') + (hh < 12 ? 'AM' : 'PM');
}

export function longWhen(e: Pick<EventLike, 'date' | 'time'>): string {
  if (!e.date) return '';
  const [y, m, d] = e.date.split('-').map(Number);
  const dow = DAYS[new Date(y, m - 1, d).getDay()];
  return dow + ' · ' + d + ' ' + MONTHS[m - 1] + ' ' + y + (e.time ? ' · ' + when(e, true).split(' at ')[1] : '');
}

export function makeCode(e: EventLike, typeCode: string): string {
  const B = BRAND_PREFIX;
  const T = (typeCode || 'R').toUpperCase();
  const s = e.salt || salt(6);
  return e.thhFirst
    ? [B, s, e.abbr, T + digits4()].join('-')
    : [e.abbr, B, T + digits4(), digits4()].join('-');
}

export function codeShape(e: EventLike, typeCode: string): string {
  return e.thhFirst
    ? BRAND_PREFIX + '-' + e.salt + '-' + e.abbr + '-' + typeCode + '####'
    : e.abbr + '-' + BRAND_PREFIX + '-' + typeCode + '####-####';
}

export interface BatchCode {
  code: string;
  type: string;
}

export interface BatchLike {
  person: string;
  codes: BatchCode[];
}

export function reservationMessage(event: EventLike, batch: BatchLike): string {
  if (batch.codes.length === 1) {
    const c = batch.codes[0];
    return (
      event.name +
      '\nTicket Reservation Code:\n\n' +
      c.code + ': ' + batch.person + ' (' + c.type + ')\n\n' +
      SIGN_OFF + ' ' + when(event, true) + ' sharp'
    );
  }
  return (
    event.name +
    '\nTicket Reservation Codes:\n\n' +
    batch.codes.map((c) => c.code + ' (' + c.type + ')').join('\n') +
    '\n\nFor: ' + batch.person + '\n' + SIGN_OFF + ' ' + when(event, false)
  );
}

export function abbrFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}
