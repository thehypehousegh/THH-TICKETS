import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';

export function Nav() {
  const { user, organizer, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-10 border-b border-divider bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="gradient-brand-text text-xl font-extrabold tracking-tight">
          THH Events
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'text-accent2' : 'text-text-dim hover:text-text')}>
            Events
          </NavLink>
          <NavLink to="/verify" className={({ isActive }) => (isActive ? 'text-accent2' : 'text-text-dim hover:text-text')}>
            Verify
          </NavLink>
          {organizer?.isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'text-accent2' : 'text-text-dim hover:text-text')}>
              Admin
            </NavLink>
          )}
          {user ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'text-accent2' : 'text-text-dim hover:text-text')}>
                Dashboard
              </NavLink>
              <button onClick={() => signOut()} className="text-text-dim hover:text-text">
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? 'text-accent2' : 'text-text-dim hover:text-text')}>
                Sign in
              </NavLink>
              <Link
                to="/signup"
                className="rounded-lg px-3.5 py-1.5 font-semibold text-white shadow-md shadow-accent/30 transition hover:brightness-110 hover:shadow-lg hover:shadow-hot/30"
                style={{ backgroundImage: 'var(--gradient-brand)' }}
              >
                Create Event
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
