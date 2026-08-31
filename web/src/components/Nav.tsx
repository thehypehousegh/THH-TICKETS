import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';

export function Nav() {
  const { user, organizer, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-10 border-b border-divider bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-semibold tracking-tight text-text">
          THH <span className="text-accent2">Events</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'text-text' : 'text-text-dim hover:text-text')}>
            Events
          </NavLink>
          <NavLink to="/verify" className={({ isActive }) => (isActive ? 'text-text' : 'text-text-dim hover:text-text')}>
            Verify
          </NavLink>
          {organizer?.isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'text-text' : 'text-text-dim hover:text-text')}>
              Admin
            </NavLink>
          )}
          {user ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'text-text' : 'text-text-dim hover:text-text')}>
                Dashboard
              </NavLink>
              <button onClick={() => signOut()} className="text-text-dim hover:text-text">
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? 'text-text' : 'text-text-dim hover:text-text')}>
                Sign in
              </NavLink>
              <Link
                to="/signup"
                className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent/90"
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
