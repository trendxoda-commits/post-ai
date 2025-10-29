
'use client';

import Link from 'next/link';
import { Button } from '../ui/button';

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


export function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex h-14 items-center px-4">
                    <AppHeader />
                    <div className="flex flex-1 items-center justify-end space-x-4">
                        <nav className="flex items-center space-x-2">
                             <Button variant="ghost" asChild>
                                <Link href="/login">Login</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/login">Sign Up</Link>
                            </Button>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="flex-1">{children}</main>
        </div>
    );
}
