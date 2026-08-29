import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { BatchRecord, EventRecord } from '../db/types';
import { longWhen } from './codes';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatStamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function buildTicketsHtml(event: EventRecord, batches: BatchRecord[]): string {
  const totalCodes = batches.reduce((n, b) => n + b.codes.length, 0);

  const rows = batches
    .map((b, i) => {
      const codesCell = b.codes
        .map((c) => `${escapeHtml(c.code)} <span class="type">(${escapeHtml(c.type)})</span>`)
        .join('<br/>');
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="name">${escapeHtml(b.person)}</td>
          <td class="codes">${codesCell}</td>
        </tr>`;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, Helvetica, Arial, sans-serif;
          color: #1a1a1a;
          margin: 0;
          padding: 32px 36px;
        }
        .brand { font-size: 10px; letter-spacing: 2px; color: #5d5294; font-weight: 700; margin-bottom: 4px; }
        h1 { font-size: 22px; margin: 0 0 6px; letter-spacing: -0.01em; }
        .meta { font-size: 12px; color: #555; margin-bottom: 2px; }
        .summary { margin-top: 14px; font-size: 12px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th {
          text-align: left; font-size: 10px; letter-spacing: 1px; text-transform: uppercase;
          color: #777; padding: 8px 10px; border-bottom: 2px solid #5d5294;
        }
        td { padding: 9px 10px; font-size: 12.5px; border-bottom: 1px solid #e5e5ea; vertical-align: top; }
        td.num { width: 34px; color: #888; }
        td.name { width: 32%; font-weight: 600; }
        td.codes { font-family: 'Courier New', monospace; font-size: 11.5px; line-height: 1.6; }
        .type { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #666; font-size: 10.5px; }
        tr:nth-child(even) { background: #fafafa; }
        .footer { margin-top: 24px; font-size: 10px; color: #999; }
      </style>
    </head>
    <body>
      <div class="brand">THE HYPE HOUSE</div>
      <h1>${escapeHtml(event.name)}</h1>
      <div class="meta">${escapeHtml(longWhen(event))}</div>
      <div class="meta">${escapeHtml(event.venue)}</div>
      <div class="summary">${totalCodes} code${totalCodes === 1 ? '' : 's'} · ${batches.length} reservation${batches.length === 1 ? '' : 's'}</div>
      <table>
        <thead>
          <tr><th>No.</th><th>Name</th><th>Code(s)</th></tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="3" style="color:#999;">No codes issued yet for this event.</td></tr>'}
        </tbody>
      </table>
      <div class="footer">Generated ${escapeHtml(formatStamp(new Date().toISOString()))}</div>
    </body>
    </html>`;
}

export async function exportEventTicketsPdf(event: EventRecord, batches: BatchRecord[]): Promise<void> {
  const html = buildTicketsHtml(event, batches);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${event.name} — tickets`,
      UTI: 'com.adobe.pdf',
    });
  }
}
