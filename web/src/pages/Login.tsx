import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { Button, Card, Field, Input, PasswordInput } from '../components/ui';

// Firebase Auth already throttles repeated failed sign-ins server-side
// (eventually returning auth/too-many-requests) -- that's the real security
// control and can't be bypassed by clearing local storage. This is just a
// client-side UX layer on top: it locks the form out after a few failed
// tries with a visible countdown, so a user gets clear feedback well before
// hitting Firebase's own limit.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

function attemptsKey(email: string) {
  return `thh-login-attempts:${email.trim().toLowerCase()}`;
}

function readAttempts(email: string): { count: number; lockedUntil: number } {
  try {
    const raw = localStorage.getItem(attemptsKey(email));
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function writeAttempts(email: string, data: { count: number; lockedUntil: number }) {
  try {
    localStorage.setItem(attemptsKey(email), JSON.stringify(data));
  } catch {
    // Best-effort only -- private browsing etc. can throw here.
  }
}

export function Login() {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const remainingSeconds = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0;
  const locked = remainingSeconds > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const state = readAttempts(email);
    const now = Date.now();
    if (state.lockedUntil > now) {
      setLockedUntil(state.lockedUntil);
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      writeAttempts(email, { count: 0, lockedUntil: 0 });
      navigate('/dashboard');
    } catch {
      const nextCount = state.count + 1;
      if (nextCount >= MAX_ATTEMPTS) {
        const until = now + LOCKOUT_MS;
        writeAttempts(email, { count: 0, lockedUntil: until });
        setLockedUntil(until);
        setError(null);
      } else {
        writeAttempts(email, { count: nextCount, lockedUntil: 0 });
        const left = MAX_ATTEMPTS - nextCount;
        setError(`Could not sign in. Check your email and password. (${left} attempt${left === 1 ? '' : 's'} left)`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setResetting(true);
    setResetError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code.includes('user-not-found') || code.includes('invalid-email')) {
        // Don't reveal whether an account exists for this email.
        setResetSent(true);
      } else {
        setResetError('Could not send the reset email right now -- please try again shortly.');
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-text">{mode === 'login' ? 'Sign in' : 'Reset password'}</h1>
      <Card>
        {mode === 'login' ? (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password">
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {locked ? (
              <p className="text-sm text-danger">Too many failed attempts. Try again in {remainingSeconds}s.</p>
            ) : (
              error && <p className="text-sm text-danger">{error}</p>
            )}
            <Button type="submit" disabled={loading || locked}>{loading ? 'Signing in...' : 'Sign in'}</Button>
            <button
              type="button"
              onClick={() => { setMode('reset'); setResetError(null); setResetSent(false); }}
              className="text-left text-sm text-accent2 hover:underline"
            >
              Forgot password?
            </button>
          </form>
        ) : resetSent ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text">
              If an account exists for <span className="font-medium">{email}</span>, a password reset link has been sent.
            </p>
            <p className="text-sm text-text-dim">Don't see it? Check your spam/junk folder too.</p>
            <Button variant="secondary" onClick={() => setMode('login')}>Back to sign in</Button>
          </div>
        ) : (
          <form onSubmit={submitReset} className="flex flex-col gap-4">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            {resetError && <p className="text-sm text-danger">{resetError}</p>}
            <Button type="submit" disabled={resetting}>{resetting ? 'Sending...' : 'Send reset link'}</Button>
            <button type="button" onClick={() => setMode('login')} className="text-left text-sm text-text-dim hover:text-text">
              Back to sign in
            </button>
          </form>
        )}
      </Card>
      <p className="mt-4 text-sm text-text-dim">
        New organizer?{' '}
        <a href="/signup" className="text-accent2 hover:underline">Create an account</a>
      </p>
    </div>
  );
}
