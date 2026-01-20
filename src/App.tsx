import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import MyCourses from "./pages/MyCourses";
import Payment from "./pages/Payment";
import Profile from "./pages/Profile";
import Lesson from "./pages/Lesson";
import Statistics from "./pages/Statistics";
import Leaderboard from "./pages/Leaderboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSections from "./pages/admin/AdminSections";
import AdminDevices from "./pages/admin/AdminDevices";
import AdminProgress from "./pages/admin/AdminProgress";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminGroups from "./pages/admin/AdminGroups";
import TeacherGroups from "./pages/teacher/TeacherGroups";
import TeacherLessons from "./pages/teacher/TeacherLessons";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherStatistics from "./pages/teacher/TeacherStatistics";
import TeacherNotifications from "./pages/teacher/TeacherNotifications";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminStatistics from "./pages/admin/AdminStatistics";
import AdminNotifications from "./pages/admin/AdminNotifications";
import NotFound from "./pages/NotFound";

// Optimized QueryClient with global defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time - data stays fresh for 30 seconds
      staleTime: 30 * 1000,
      // Default garbage collection time - 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
      // Don't refetch on window focus by default (reduces unnecessary API calls)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: true,
      // Network mode - always fetch even if offline (for PWA support)
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Network mode for mutations
      networkMode: 'offlineFirst',
    },
  },
});

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Determine default route based on user role
  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/';
    if (user?.role === 'student') return '/courses';
    return '/dashboard';
  };

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Login />} />
      <Route path="/setup" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Setup />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['admin', 'teacher']}>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/courses" element={
        <ProtectedRoute allowedRoles={['student']}>
          <MyCourses />
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />

      <Route path="/payment" element={
        <ProtectedRoute allowedRoles={['student']}>
          <Payment />
        </ProtectedRoute>
      } />

      <Route path="/statistics" element={
        <ProtectedRoute allowedRoles={['student']}>
          <Statistics />
        </ProtectedRoute>
      } />

      <Route path="/leaderboard" element={
        <ProtectedRoute allowedRoles={['student']}>
          <Leaderboard />
        </ProtectedRoute>
      } />

      <Route path="/lesson/:unitId" element={
        <ProtectedRoute>
          <Lesson />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminUsers />
        </ProtectedRoute>
      } />

      <Route path="/admin/payments" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminPayments />
        </ProtectedRoute>
      } />

      <Route path="/admin/sections" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminSections />
        </ProtectedRoute>
      } />

      <Route path="/admin/groups" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminGroups />
        </ProtectedRoute>
      } />

      <Route path="/admin/devices" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDevices />
        </ProtectedRoute>
      } />

      <Route path="/admin/progress" element={
        <ProtectedRoute allowedRoles={['admin', 'teacher']}>
          <AdminProgress />
        </ProtectedRoute>
      } />

      <Route path="/admin/settings" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminSettings />
        </ProtectedRoute>
      } />

      {/* Teacher Routes */}
      <Route path="/groups" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherGroups />
        </ProtectedRoute>
      } />

      <Route path="/lessons" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherLessons />
        </ProtectedRoute>
      } />

      <Route path="/attendance" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherAttendance />
        </ProtectedRoute>
      } />

      <Route path="/teacher/statistics" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherStatistics />
        </ProtectedRoute>
      } />

      <Route path="/teacher/notifications" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherNotifications />
        </ProtectedRoute>
      } />

      <Route path="/admin/attendance" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminAttendance />
        </ProtectedRoute>
      } />

      <Route path="/admin/statistics" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminStatistics />
        </ProtectedRoute>
      } />

      <Route path="/admin/notifications" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminNotifications />
        </ProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
