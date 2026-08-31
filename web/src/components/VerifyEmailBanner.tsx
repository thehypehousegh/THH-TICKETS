import { useState } from 'react';
import { useAuth } from '../data/AuthContext';

export function VerifyEmailBanner() {
  const { user, emailVerified, resendVerificationEmail, refreshEmailVerified } = useAuth();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user || emailVerified) return null;

  async function resend() {
    setBusy(true);
    try {
      await resendVerificationEmail();
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    try {
      await refreshEmailVerified();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-warm/15 px-4 py-2 text-sm text-warm">
      <span>Verify your email ({user.email}) to secure your account.</span>
      {sent ? (
        <span className="font-medium">Verification email sent -- check your inbox.</span>
      ) : (
        <button onClick={resend} disabled={busy} className="font-semibold underline disabled:opacity-50">
          Resend email
        </button>
      )}
      <button onClick={refresh} disabled={busy} className="font-semibold underline disabled:opacity-50">
        I've verified -- refresh
      </button>
    </div>
  );
}
