import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { Button, Card, Field, Input } from '../components/ui';

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch {
      setError('Could not sign in. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setResetting(true);
    setError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch {
      // Firebase returns the same error for "not found" as for other issues
      // when email enumeration protection is on -- show the sent state
      // regardless so we don't leak which emails have accounts.
      setResetSent(true);
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
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
            <button
              type="button"
              onClick={() => { setMode('reset'); setError(null); setResetSent(false); }}
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
            <Button variant="secondary" onClick={() => setMode('login')}>Back to sign in</Button>
          </div>
        ) : (
          <form onSubmit={submitReset} className="flex flex-col gap-4">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
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
