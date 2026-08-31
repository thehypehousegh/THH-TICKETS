import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { Button, Card, Field, Input, PasswordInput } from '../components/ui';
import type { PayoutDetails } from '../data/types';

export function Profile() {
  const { organizer, updateOrganizer, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PayoutDetails['method']>(organizer?.payout?.method ?? 'momo');
  const [network, setNetwork] = useState(organizer?.payout?.network ?? '');
  const [phone, setPhone] = useState(organizer?.payout?.phone ?? '');
  const [bankName, setBankName] = useState(organizer?.payout?.bankName ?? '');
  const [accountName, setAccountName] = useState(organizer?.payout?.accountName ?? '');
  const [accountNumber, setAccountNumber] = useState(organizer?.payout?.accountNumber ?? '');
  const [saved, setSaved] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(password);
      navigate('/');
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      setDeleteError(
        code.includes('wrong-password') || code.includes('invalid-credential')
          ? 'That password is incorrect.'
          : 'Could not delete your account -- try again.'
      );
    } finally {
      setDeleting(false);
    }
  }

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

      <div className="mt-8 rounded-xl border border-danger/30 p-5">
        <h2 className="mb-1 text-base font-semibold text-danger">Danger zone</h2>
        <p className="mb-4 text-sm text-text-dim">
          Permanently deletes your account, every event you've created, your support conversations, and your
          uploaded images. This can't be undone.
        </p>
        {confirming ? (
          <form onSubmit={handleDelete} className="flex flex-col gap-3">
            <Field label="Confirm your password to continue">
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
            </Field>
            {deleteError && <p className="text-sm text-danger">{deleteError}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="danger" disabled={deleting || !password}>
                {deleting ? 'Deleting account...' : 'Permanently delete my account'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setConfirming(false); setPassword(''); setDeleteError(null); }}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="danger" onClick={() => setConfirming(true)}>Delete my account</Button>
        )}
      </div>
    </div>
  );
}
