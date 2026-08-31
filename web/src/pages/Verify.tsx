import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getEvent, watchEventBatches, setCodeUsed } from '../data/queries';
import { findCodeMatches } from '../utils/verify';
import type { CodeMatch } from '../utils/verify';
import { Button, Card, Input, Tag } from '../components/ui';
import type { BatchRecord, EventRecord } from '../data/types';

const SCANNER_ID = 'thh-verifier-scanner';

function verifierName(): string {
  let name = localStorage.getItem('thh-verifier-name');
  if (!name) {
    name = prompt('Your name or door station (for the check-in log):')?.trim() || 'Verifier';
    localStorage.setItem('thh-verifier-name', name);
  }
  return name;
}

export function Verify() {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busyCodeId, setBusyCodeId] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!event) return;
    return watchEventBatches(event.id, setBatches);
  }, [event]);

  useEffect(() => {
    if (!scanning || !event) return;
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decoded) => {
          setQuery(decoded);
          setScanning(false);
        },
        undefined
      )
      .catch(() => setJoinError('Could not access the camera.'));
    return () => {
      scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [scanning, event]);

  async function joinEvent() {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    try {
      const found = await getEvent(joinCode.trim().toUpperCase());
      if (!found) {
        setJoinError("No event matches that code. Double-check it with the organizer.");
        return;
      }
      setEvent(found);
    } finally {
      setJoining(false);
    }
  }

  async function toggle(match: CodeMatch, used: boolean) {
    if (!event) return;
    setBusyCodeId(match.code.id);
    try {
      await setCodeUsed(event.id, match.code.id, used, verifierName());
    } finally {
      setBusyCodeId(null);
    }
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="mb-2 text-2xl font-semibold text-text">Verify tickets</h1>
        <p className="mb-6 text-sm text-text-dim">
          No app install needed -- works on any phone or laptop, including iOS. Enter the event's join
          code from the organizer to start checking tickets in.
        </p>
        <Card className="flex flex-col gap-3">
          <Input
            value={joinCode}
            onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null); }}
            placeholder="XXXXXXX"
            className="text-center font-mono text-lg tracking-widest"
          />
          {joinError && <p className="text-sm text-danger">{joinError}</p>}
          <Button onClick={joinEvent} disabled={!joinCode.trim() || joining}>
            {joining ? 'Joining...' : 'Join event'}
          </Button>
        </Card>
      </div>
    );
  }

  const allCodes = batches.flatMap((b) => b.codes);
  const checkedIn = allCodes.filter((c) => c.usedAt).length;
  const matches = findCodeMatches(batches, query).slice(0, 8);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">{event.name}</h1>
          <p className="text-sm text-text-dim">{checkedIn} / {allCodes.length} checked in</p>
        </div>
        <Button variant="ghost" onClick={() => setEvent(null)}>Leave</Button>
      </div>

      {scanning ? (
        <Card className="flex flex-col gap-3">
          <div id={SCANNER_ID} className="overflow-hidden rounded-lg" />
          <Button variant="secondary" onClick={() => setScanning(false)}>Stop scanning</Button>
        </Card>
      ) : (
        <div className="mb-4 flex flex-col gap-2">
          <Button onClick={() => setScanning(true)}>Scan QR code</Button>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="Or type part of a code to verify..."
            className="font-mono"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {query.trim() ? (
          matches.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-dim">No codes match "{query.trim()}".</p>
          ) : (
            matches.map((m) => (
              <Card key={m.code.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm text-text">{m.code.code}</p>
                  <p className="text-xs text-text-dim">{m.batch.person} · {m.code.type}</p>
                  <Tag variant={m.code.usedAt ? 'good' : 'outline'}>{m.code.usedAt ? 'Checked in' : 'Not checked in'}</Tag>
                </div>
                <Button
                  variant={m.code.usedAt ? 'secondary' : 'primary'}
                  disabled={busyCodeId === m.code.id}
                  onClick={() => toggle(m, !m.code.usedAt)}
                >
                  {m.code.usedAt ? 'Undo' : 'Check in'}
                </Button>
              </Card>
            ))
          )
        ) : (
          <p className="py-10 text-center text-sm text-text-dim">Scan a ticket, or type part of a code above to search.</p>
        )}
      </div>
    </div>
  );
}
