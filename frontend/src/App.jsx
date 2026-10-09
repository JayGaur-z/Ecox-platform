import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Public
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';

// User
import Dashboard from './pages/Dashboard';
import CarbonCalculator from './pages/CarbonCalculator';
import ReductionPlanner from './pages/ReductionPlanner';
import Challenges from './pages/Challenges';
import ChallengeDetails from './pages/ChallengeDetails';
import SubmitProof from './pages/SubmitProof';
import Progress from './pages/Progress';
import Badges from './pages/Badges';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

// Admin
import AdminDashboard from './pages/AdminDashboard';
import AdminChallenges from './pages/AdminChallenges';
import AdminVerification from './pages/AdminVerification';
import AdminRoute from './components/AdminRoute';

// Auth Guards
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-green-600">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const isAdmin = user.role === 'admin' || user.role === 'ADMIN';
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* User Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/calculator" element={<ProtectedRoute><CarbonCalculator /></ProtectedRoute>} />
      <Route path="/planner" element={<ProtectedRoute><ReductionPlanner /></ProtectedRoute>} />
      <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
      <Route path="/challenges/:id" element={<ProtectedRoute><ChallengeDetails /></ProtectedRoute>} />
      <Route path="/submit/:id" element={<ProtectedRoute><SubmitProof /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/badges" element={<ProtectedRoute><Badges /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* Admin Routes strictly protected by AdminRoute */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/challenges" element={<AdminRoute><AdminChallenges /></AdminRoute>} />
      <Route path="/admin/verification" element={<AdminRoute><AdminVerification /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
