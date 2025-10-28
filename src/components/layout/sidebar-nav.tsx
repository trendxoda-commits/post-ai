'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, BarChart2, Settings, PlusSquare, Inbox, ShieldCheck } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useUser } from '@/firebase';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/create-post', label: 'Create Post', icon: PlusSquare },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminNavItem = {
    href: '/admin', label: 'Admin', icon: ShieldCheck
}

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();
  
  const isAdmin = user?.email === 'mohitmleena2@gmail.com';

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href)}
            tooltip={item.label}
            className="justify-start"
          >
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      {isAdmin && (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(adminNavItem.href)}
                tooltip={adminNavItem.label}
                className="justify-start"
            >
                <Link href={adminNavItem.href}>
                    <adminNavItem.icon className="h-4 w-4" />
                    <span>{adminNavItem.label}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
}
