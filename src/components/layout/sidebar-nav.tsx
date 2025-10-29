
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, BarChart2, Settings, PlusSquare, Shield } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useUser } from '@/firebase';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/create-post', label: 'Create Post', icon: PlusSquare },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminNavItems = [
    { href: '/admin/dashboard', label: 'Admin Panel', icon: Shield },
]

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const adminEmail = "mohitmleena4@gmail.com";


  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && !pathname.startsWith('/admin')}
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
    
      {/* Conditionally render admin link */}
      {user?.email === adminEmail && (
        <>
            <SidebarSeparator />
            {adminNavItems.map((item) => (
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
        </>
      )}
    </SidebarMenu>
  );
}
