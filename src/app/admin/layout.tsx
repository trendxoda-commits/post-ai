
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

  // Auto-login the admin
  useEffect(() => {
    login();
  }, []);

  const login = () => {
    sessionStorage.setItem('isAdmin', 'true');
    setIsAdmin(true);
  };

  const logout = () => {
    sessionStorage.removeItem('isAdmin');
    setIsAdmin(false);
  };
  
  // Render children immediately if isAdmin is true, otherwise show a loader.
  // This prevents brief flashes of content before the auto-login takes effect.
  return (
    <AdminAuthContext.Provider value={{ isAdmin, login, logout }}>
      {isAdmin ? children : (
         <div className="flex h-screen w-full items-center justify-center bg-muted">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </AdminAuthContext.Provider>
  );
}


export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
     <FirebaseClientProvider>
        <AdminAuthProvider>
            {children}
        </AdminAuthProvider>
    </FirebaseClientProvider>
  );
}
