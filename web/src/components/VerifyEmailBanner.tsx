import { useState } from 'react';
import { useAuth } from '../data/AuthContext';

export function VerifyEmailBanner() {
  const { user, emailVerified, resendVerificationEmail, refreshEmailVerified } = useAuth();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || emailVerified) return null;

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await resendVerificationEmail();
      setSent(true);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      setError(
        code.includes('too-many-requests')
          ? 'Too many attempts -- wait a few minutes before trying again.'
          : 'Could not send the verification email -- try again shortly.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      await refreshEmailVerified();
    } catch {
      setError('Could not check your verification status -- try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-warm/15 px-4 py-2 text-center text-sm text-warm">
      <span>Verify your email ({user.email}) to secure your account.</span>
      {sent ? (
        <span className="font-medium">Sent -- check your inbox (and spam/junk folder).</span>
      ) : (
        <button onClick={resend} disabled={busy} className="font-semibold underline disabled:opacity-50">
          Resend email
        </button>
      )}
      <button onClick={refresh} disabled={busy} className="font-semibold underline disabled:opacity-50">
        I've verified -- refresh
      </button>
      {error && <span className="w-full text-danger">{error}</span>}
    </div>
  );
}
