
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FirebaseClientProvider, useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

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

function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check session storage on initial load
    const storedStatus = sessionStorage.getItem('isAdmin');
    if (storedStatus === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const login = () => {
    sessionStorage.setItem('isAdmin', 'true');
    setIsAdmin(true);
  };

  const logout = () => {
    sessionStorage.removeItem('isAdmin');
    setIsAdmin(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  // This effect handles redirection based on auth state
  useEffect(() => {
    if (!isAdmin && pathname !== '/admin/login') {
      router.push('/admin/login');
    } else if (isAdmin && pathname === '/admin/login') {
      router.push('/admin/dashboard');
    }
  }, [isAdmin, pathname, router]);

  // While redirecting, show a loader
  if (!isAdmin && pathname !== '/admin/login') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}


export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
     <FirebaseClientProvider>
        <AdminAuthProvider>
            <AdminLayoutContent>
                {children}
            </AdminLayoutContent>
        </AdminAuthProvider>
    </FirebaseClientProvider>
  );
}
