import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'admin' | 'teacher' | 'student';
export type PaymentStatus = 'pending' | 'approved' | 'blocked';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  paymentStatus: PaymentStatus;
  deviceId?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate a unique device ID
function getDeviceId(): string {
  let deviceId = localStorage.getItem('learnbox_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('learnbox_device_id', deviceId);
  }
  return deviceId;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      if (!profile) {
        console.error('No profile found for user');
        return null;
      }

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      // Fetch latest payment status
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentError) {
        console.error('Error fetching payment:', paymentError);
      }

      const role = (roleData?.role as UserRole) || 'student';
      
      // Admins and teachers don't need payment - always approved
      const paymentStatus: PaymentStatus = 
        role === 'admin' || role === 'teacher' 
          ? 'approved' 
          : (paymentData?.status as PaymentStatus) || 'pending';

      return {
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        name: profile.name,
        avatar_url: profile.avatar_url,
        role,
        paymentStatus,
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const checkDeviceAccess = async (userId: string): Promise<{ allowed: boolean; message?: string }> => {
    const currentDeviceId = getDeviceId();
    
    // Check if user has any approved device
    const { data: devices, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error checking devices:', error);
      return { allowed: true }; // Allow on error to not block user
    }

    const approvedDevice = devices?.find(d => d.is_approved);
    const currentDevice = devices?.find(d => d.device_id === currentDeviceId);

    if (!devices || devices.length === 0) {
      // First device for this user - register it
      const { error: insertError } = await supabase
        .from('devices')
        .insert({
          user_id: userId,
          device_id: currentDeviceId,
          device_name: navigator.userAgent.substring(0, 100),
          is_approved: true,
          is_active: true,
        });

      if (insertError) {
        console.error('Error registering device:', insertError);
      }
      return { allowed: true };
    }

    if (currentDevice?.is_approved) {
      // Update last login
      await supabase
        .from('devices')
        .update({ last_login: new Date().toISOString() })
        .eq('id', currentDevice.id);
      return { allowed: true };
    }

    if (approvedDevice && approvedDevice.device_id !== currentDeviceId) {
      // Different device is approved - check if current device is registered but not approved
      if (currentDevice && !currentDevice.is_approved) {
        return { 
          allowed: false, 
          message: 'This device is pending approval. Please contact your administrator.' 
        };
      }

      // Register new device as pending
      const { error: insertError } = await supabase
        .from('devices')
        .insert({
          user_id: userId,
          device_id: currentDeviceId,
          device_name: navigator.userAgent.substring(0, 100),
          is_approved: false,
          is_active: true,
        });

      if (insertError && insertError.code !== '23505') { // Ignore duplicate error
        console.error('Error registering new device:', insertError);
      }

      return { 
        allowed: false, 
        message: 'You are trying to login from a new device. Please contact your administrator to approve this device.' 
      };
    }

    return { allowed: true };
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchUserProfile(session.user.id).then(profile => {
              setUser(profile);
              setIsLoading(false);
            });
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          setUser(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Login failed. Please try again.' };
      }

      // Check device access
      const deviceCheck = await checkDeviceAccess(data.user.id);
      if (!deviceCheck.allowed) {
        await supabase.auth.signOut();
        return { success: false, error: deviceCheck.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id);
      setUser(profile);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated: !!user, 
      isLoading,
      login, 
      logout,
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
