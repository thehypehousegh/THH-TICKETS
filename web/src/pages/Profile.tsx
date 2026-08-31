import { useState } from 'react';
import { useAuth } from '../data/AuthContext';
import { Button, Card, Field, Input } from '../components/ui';
import type { PayoutDetails } from '../data/types';

export function Profile() {
  const { organizer, updateOrganizer } = useAuth();
  const [method, setMethod] = useState<PayoutDetails['method']>(organizer?.payout?.method ?? 'momo');
  const [network, setNetwork] = useState(organizer?.payout?.network ?? '');
  const [phone, setPhone] = useState(organizer?.payout?.phone ?? '');
  const [bankName, setBankName] = useState(organizer?.payout?.bankName ?? '');
  const [accountName, setAccountName] = useState(organizer?.payout?.accountName ?? '');
  const [accountNumber, setAccountNumber] = useState(organizer?.payout?.accountNumber ?? '');
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payout: PayoutDetails = { method, network, phone, bankName, accountName, accountNumber };
    await updateOrganizer({ payout });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-text">Payout profile</h1>
      <Card>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label="Payout method">
            <select value={method} onChange={(e) => setMethod(e.target.value as PayoutDetails['method'])} className="w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm text-text">
              <option value="momo">Mobile money</option>
              <option value="bank">Bank</option>
            </select>
          </Field>
          {method === 'momo' ? (
            <>
              <Field label="Network"><Input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="MTN / Vodafone / AirtelTigo" /></Field>
              <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            </>
          ) : (
            <>
              <Field label="Bank name"><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></Field>
              <Field label="Account name"><Input value={accountName} onChange={(e) => setAccountName(e.target.value)} /></Field>
              <Field label="Account number"><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></Field>
            </>
          )}
          <Button type="submit">{saved ? 'Saved' : 'Save'}</Button>
        </form>
      </Card>
    </div>
  );
}
