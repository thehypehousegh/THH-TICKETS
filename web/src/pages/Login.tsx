import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { Button, Card, Field, Input } from '../components/ui';

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-text">Sign in</h1>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-text-dim">
        New organizer?{' '}
        <a href="/signup" className="text-accent2 hover:underline">Create an account</a>
      </p>
    </div>
  );
}
