import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Menu,
  BarChart3,
  User,
  UsersRound,
  CalendarCheck,
  Trophy,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = {
  student: [
    { icon: GraduationCap, label: 'Kurslarim', path: '/courses' },
    { icon: BarChart3, label: 'Statistika', path: '/statistics' },
    { icon: Trophy, label: 'Reyting', path: '/leaderboard' },
    { icon: CreditCard, label: "To'lov", path: '/payment' },
    { icon: User, label: 'Profil', path: '/profile' },
  ],
  teacher: [
    { icon: LayoutDashboard, label: 'Bosh sahifa', path: '/dashboard' },
    { icon: Users, label: 'Guruhlarim', path: '/groups' },
    { icon: GraduationCap, label: 'Darslar', path: '/lessons' },
    { icon: CalendarCheck, label: 'Davomat', path: '/attendance' },
    { icon: BarChart3, label: 'Statistika', path: '/teacher/statistics' },
    { icon: User, label: 'Profil', path: '/profile' },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Bosh sahifa', path: '/dashboard' },
    { icon: Users, label: 'Foydalanuvchilar', path: '/admin/users' },
    { icon: UsersRound, label: 'Guruhlar', path: '/admin/groups' },
    { icon: GraduationCap, label: "Bo'limlar", path: '/admin/sections' },
    { icon: CreditCard, label: "To'lovlar", path: '/admin/payments' },
    { icon: Shield, label: 'Qurilmalar', path: '/admin/devices' },
    { icon: CalendarCheck, label: 'Davomat', path: '/admin/attendance' },
    { icon: BarChart3, label: 'Statistika', path: '/admin/statistics' },
    { icon: Bell, label: 'Xabarnomalar', path: '/admin/notifications' },
    { icon: Settings, label: 'Sozlamalar', path: '/admin/settings' },
    { icon: User, label: 'Profil', path: '/profile' },
  ],
};

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const items = navItems[user.role];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      className="fixed left-0 top-0 bottom-0 z-40 bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">LearnBox</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="shrink-0"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
                whileHover={{ x: 4 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                  />
                )}
                <item.icon className="w-5 h-5 shrink-0" />
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50',
            isCollapsed && 'justify-center'
          )}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
            {user.name.charAt(0)}
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          variant="ghost"
          className={cn('w-full mt-2 justify-start', isCollapsed && 'justify-center px-0')}
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="ml-2">Chiqish</span>}
        </Button>
      </div>
    </motion.aside>
  );
}
