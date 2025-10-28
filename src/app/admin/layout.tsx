
'use client';

import Link from 'next/link';
import {
  Bell,
  Home,
  LineChart,
  Package2,
  Settings,
  Users,
  PlusSquare,
  PanelLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/admin/create-post', label: 'Create Post', icon: PlusSquare },
  { href: '/admin/accounts', label: 'Accounts', icon: Users },
  { href: '#', label: 'Analytics', icon: LineChart },
  { href: '#', label: 'Settings', icon: Settings },
];


function NavLink({ href, label, icon: Icon, isActive }: { href: string, label: string, icon: React.ElementType, isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "transition-colors hover:text-foreground",
        isActive ? "text-foreground font-semibold" : "text-muted-foreground"
      )}
    >
      {label}
    </Link>
  );
}


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-xs">
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="#"
                className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
              >
                <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
                <span className="sr-only">Social Streamliner</span>
              </Link>
              {navLinks.map(link => (
                 <Link
                  key={link.href}
                  href={link.href}
                  className={cn("flex items-center gap-4 px-2.5", pathname === link.href ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="relative flex-1 md:grow-0">
           <Link href="#" className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6" />
              <span className="">Social Streamliner</span>
            </Link>
        </div>
        <nav className="hidden flex-col gap-6 text-sm font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
            {navLinks.map(link => (
                <NavLink key={link.href} href={link.href} label={link.label} icon={link.icon} isActive={pathname === link.href} />
            ))}
        </nav>
        <div className="relative flex-1 md:grow-0">
            {/* Can add user menu here */}
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
