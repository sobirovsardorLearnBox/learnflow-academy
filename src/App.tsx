import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// Lazy loaded pages - reduces initial bundle size
const Login = lazy(() => import("./pages/Login"));
const Setup = lazy(() => import("./pages/Setup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyCourses = lazy(() => import("./pages/MyCourses"));
const Payment = lazy(() => import("./pages/Payment"));
const Profile = lazy(() => import("./pages/Profile"));
const Lesson = lazy(() => import("./pages/Lesson"));
const Statistics = lazy(() => import("./pages/Statistics"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Install = lazy(() => import("./pages/Install"));

// Admin pages
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminSections = lazy(() => import("./pages/admin/AdminSections"));
const AdminDevices = lazy(() => import("./pages/admin/AdminDevices"));
const AdminProgress = lazy(() => import("./pages/admin/AdminProgress"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminGroups = lazy(() => import("./pages/admin/AdminGroups"));
const AdminAttendance = lazy(() => import("./pages/admin/AdminAttendance"));
const AdminStatistics = lazy(() => import("./pages/admin/AdminStatistics"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminVideos = lazy(() => import("./pages/admin/AdminVideos"));

// Teacher pages
const TeacherGroups = lazy(() => import("./pages/teacher/TeacherGroups"));
const TeacherLessons = lazy(() => import("./pages/teacher/TeacherLessons"));
const TeacherAttendance = lazy(() => import("./pages/teacher/TeacherAttendance"));
const TeacherStatistics = lazy(() => import("./pages/teacher/TeacherStatistics"));
const TeacherNotifications = lazy(() => import("./pages/teacher/TeacherNotifications"));

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

// Page loading fallback for lazy components
function PageLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Sahifa yuklanmoqda...</p>
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

  return <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>;
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
      <Route path="/" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Suspense fallback={<PageLoadingFallback />}><Login /></Suspense>} />
      <Route path="/setup" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Suspense fallback={<PageLoadingFallback />}><Setup /></Suspense>} />
      <Route path="/install" element={<Suspense fallback={<PageLoadingFallback />}><Install /></Suspense>} />
      
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

      <Route path="/admin/videos" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminVideos />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Suspense fallback={<PageLoadingFallback />}><NotFound /></Suspense>} />
    </Routes>
  );
}

// PWA Components
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { SyncIndicator } from "@/components/pwa/SyncIndicator";
import { BackgroundSyncProvider } from "@/contexts/BackgroundSyncContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BackgroundSyncProvider>
            <OfflineIndicator />
            <InstallPrompt />
            <SyncIndicator />
            <AppRoutes />
          </BackgroundSyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
