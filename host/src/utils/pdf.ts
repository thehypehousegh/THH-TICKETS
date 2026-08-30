import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { BatchRecord, EventRecord } from '../data/types';
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function buildTicketsHtml(event: EventRecord, batches: BatchRecord[]): string {
  const allCodes = batches.flatMap((b) => b.codes);
  const totalCodes = allCodes.length;
  const verifiedCodes = allCodes.filter((c) => c.usedAt).length;
  const unverifiedCodes = totalCodes - verifiedCodes;

  const rows = batches
    .map((b, i) => {
      const codesCell = b.codes
        .map((c) => {
          const status = c.usedAt
            ? `<span class="status ok">✓ checked in ${escapeHtml(formatTime(c.usedAt))}</span>`
            : `<span class="status pending">not checked in</span>`;
          return `${escapeHtml(c.code)} <span class="type">(${escapeHtml(c.type)})</span> ${status}`;
        })
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
        .summary { margin-top: 14px; display: flex; gap: 18px; }
        .stat { font-size: 12px; color: #555; }
        .stat b { font-size: 15px; color: #1a1a1a; display: block; }
        .stat.ok b { color: #1a8a4c; }
        .stat.pending b { color: #b0740a; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        th {
          text-align: left; font-size: 10px; letter-spacing: 1px; text-transform: uppercase;
          color: #777; padding: 8px 10px; border-bottom: 2px solid #5d5294;
        }
        td { padding: 9px 10px; font-size: 12.5px; border-bottom: 1px solid #e5e5ea; vertical-align: top; }
        td.num { width: 34px; color: #888; }
        td.name { width: 28%; font-weight: 600; }
        td.codes { font-family: 'Courier New', monospace; font-size: 11.5px; line-height: 1.8; }
        .type { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #666; font-size: 10.5px; }
        .status { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 10px; margin-left: 4px; }
        .status.ok { color: #1a8a4c; }
        .status.pending { color: #b0740a; }
        tr:nth-child(even) { background: #fafafa; }
        .footer { margin-top: 24px; font-size: 10px; color: #999; }
      </style>
    </head>
    <body>
      <div class="brand">THE HYPE HOUSE</div>
      <h1>${escapeHtml(event.name)}</h1>
      <div class="meta">${escapeHtml(longWhen(event))}</div>
      <div class="meta">${escapeHtml(event.venueName)}</div>
      <div class="summary">
        <div class="stat"><b>${totalCodes}</b>generated</div>
        <div class="stat ok"><b>${verifiedCodes}</b>checked in</div>
        <div class="stat pending"><b>${unverifiedCodes}</b>not checked in</div>
        <div class="stat"><b>${batches.length}</b>reservation${batches.length === 1 ? '' : 's'}</div>
      </div>
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
