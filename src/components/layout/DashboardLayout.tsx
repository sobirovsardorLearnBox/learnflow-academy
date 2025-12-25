import { useState, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { motion } from 'framer-motion';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <motion.main
        initial={false}
        animate={{ marginLeft: isCollapsed ? 80 : 280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="min-h-screen"
      >
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
