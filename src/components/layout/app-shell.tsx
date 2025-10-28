
'use client';

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { useFirebase, useUser } from '@/firebase';
import { Button } from '../ui/button';
import { LogOut } from 'lucide-react';
import { redirect, usePathname } from 'next/navigation';
import { FirebaseClientProvider } from '@/firebase';

const AppLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 text-primary-foreground"
  >
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

const AppHeader = () => (
  <div className="flex items-center gap-2">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
      <AppLogo />
    </div>
    <h1 className="text-xl font-bold font-headline text-foreground">
      Social Streamliner
    </h1>
  </div>
);


export function AppShell({ children }: { children: React.ReactNode }) {
  const { auth } = useFirebase();
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  // If we are on an admin page, let the admin layout handle everything.
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  // Allow access to public pages without login
  if (pathname === '/login') {
      if (isUserLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <AppLogo />
                </div>
                <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
      }
      if (user) {
        redirect('/dashboard');
      }
      return (
      <main className="min-h-screen">
          <div className="flex flex-col items-center justify-center pt-16">
            {children}
          </div>
      </main>
    );
  }
  if (pathname === '/instagram-callback') {
    return <main>{children}</main>;
  }


  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <AppLogo />
          </div>
           <p className="text-muted-foreground">Loading Social Streamliner...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    redirect('/login');
  }
  
  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <AppHeader />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:hidden flex justify-between items-center mb-4">
          <AppHeader />
          <SidebarTrigger />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
