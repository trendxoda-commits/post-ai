'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

type AdminAuthContextType = {
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check session storage to persist login state across reloads
    const loggedIn = sessionStorage.getItem('isAdminLoggedIn');
    if (loggedIn === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const login = () => {
    setIsAdmin(true);
    sessionStorage.setItem('isAdminLoggedIn', 'true');
  };

  const logout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('isAdminLoggedIn');
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // We need to wrap the children with the provider,
  // but also check the auth state at the layout level.
  const AdminLayoutContent = () => {
    const { isAdmin } = useAdminAuth();

    useEffect(() => {
      // If not admin and not on the login page, redirect to admin login
      if (!isAdmin && pathname !== '/admin/login') {
        router.push('/admin/login');
      }
      // If admin and on the login page, redirect to dashboard
      if (isAdmin && pathname === '/admin/login') {
        router.push('/admin/dashboard');
      }
    }, [isAdmin, pathname, router]);

    // Show children only if admin, or if on the login page
    if (isAdmin || pathname === '/admin/login') {
      return <>{children}</>;
    }

    // Render loading or null while redirecting
    return null;
  };

  return (
    <AdminAuthProvider>
      <AdminLayoutContent />
    </AdminAuthProvider>
  );
}
