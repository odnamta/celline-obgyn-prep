'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, User } from 'lucide-react';
import { ReactNode } from 'react';

export interface NavItem {
  href: string;
  icon: ReactNode;
  label: string;
}

/**
 * Navigation items for the mobile nav bar
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: <Home className="h-5 w-5" />, label: 'Home' },
  { href: '/library', icon: <Library className="h-5 w-5" />, label: 'Library' },
  { href: '/profile', icon: <User className="h-5 w-5" />, label: 'Profile' },
];

/**
 * Determines if a nav item is active based on current pathname
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/';
  }
  return pathname.startsWith(href);
}

/**
 * Returns the CSS classes for a nav item based on active state
 */
export function getNavItemClasses(isActive: boolean): string {
  const baseClasses = 'flex flex-col items-center justify-center py-2 px-3 transition-colors min-h-[48px]';
  const activeClasses = 'text-blue-600';
  const inactiveClasses = 'text-slate-500 hover:text-slate-700';
  
  return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
}

export interface MobileNavBarProps {
  className?: string;
}

/**
 * MobileNavBar component - Fixed bottom navigation for mobile devices
 * Requirements: 4.1, 4.3, 4.4, 4.5 - Mobile bottom nav with Home, Library, Profile
 */
export function MobileNavBar({ className = '' }: MobileNavBarProps) {
  const pathname = usePathname();

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 md:hidden z-40 pb-safe ${className}`}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={getNavItemClasses(isActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNavBar;
