
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    PlusSquare,
    Users,
    BarChart2,
    Settings,
    PanelLeft,
    Home,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

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

const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/accounts', label: 'Accounts', icon: Users },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/admin/create-post', label: 'Create Post', icon: PlusSquare },
  ];

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link href={href} passHref>
            <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
            >
                {children}
            </Button>
        </Link>
    );
}


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 lg:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                       <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                            <AppLogo />
                        </div>
                        <span className="">Social Streamliner</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-4 text-sm font-medium">
                        {navItems.map(item => (
                             <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                    pathname === item.href && "bg-muted text-primary"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                 <div className="mt-auto p-4 border-t">
                    <Button size="sm" variant="ghost" className="w-full justify-start" asChild>
                        <Link href="/dashboard">
                           <Home className="mr-2 h-4 w-4" />
                           Back to App
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
        <div className="flex flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px] lg:px-6">
                 <Sheet>
                    <SheetTrigger asChild>
                        <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 lg:hidden"
                        >
                        <PanelLeft className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col">
                         <nav className="grid gap-2 text-lg font-medium">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 text-lg font-semibold mb-4"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                                    <AppLogo />
                                </div>
                                <span className="text-base">Social Streamliner</span>
                            </Link>
                             {navItems.map(item => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                        pathname === item.href && "bg-muted text-primary"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            ))}
                         </nav>
                          <div className="mt-auto border-t pt-4">
                            <Button size="sm" variant="ghost" className="w-full justify-start" asChild>
                                <Link href="/dashboard">
                                <Home className="mr-2 h-4 w-4" />
                                Back to App
                                </Link>
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
                <div className="flex-1" />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.photoURL || undefined} />
                                <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="sr-only">Toggle user menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                 {children}
            </main>
        </div>
    </div>
  );
}
