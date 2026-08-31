import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './data/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { Nav } from './components/Nav';
import { ChatWidget } from './components/ChatWidget';
import { VerifyEmailBanner } from './components/VerifyEmailBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './pages/Home';
import { EventDetail } from './pages/EventDetail';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { EventForm } from './pages/EventForm';
import { EventManage } from './pages/EventManage';
import { Verify } from './pages/Verify';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { Support } from './pages/Support';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Nav />
          <VerifyEmailBanner />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/e/:eventId" element={<EventDetail />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/dashboard/new" element={<RequireAuth><EventForm /></RequireAuth>} />
            <Route path="/dashboard/events/:eventId" element={<RequireAuth><EventManage /></RequireAuth>} />
            <Route path="/dashboard/events/:eventId/edit" element={<RequireAuth><EventForm /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/support" element={<RequireAuth><Support /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
          </Routes>
          <ChatWidget />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
