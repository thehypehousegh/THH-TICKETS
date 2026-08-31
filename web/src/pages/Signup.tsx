import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { Button, Card, Field, Input } from '../components/ui';

export function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, name, contact);
      navigate('/dashboard');
    } catch {
      setError('Could not create your account. The email may already be in use, or the password is too short.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-text">Create an organizer account</h1>
      <p className="mb-6 text-sm text-text-dim">
        Publish free. Create and manage events from here, or from the THH Ticket Codes host app -- both
        write to the same account.
      </p>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Organizer / brand name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Contact (phone)">
            <Input value={contact} onChange={(e) => setContact(e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-text-dim">
        Already have an account? <Link to="/login" className="text-accent2 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
