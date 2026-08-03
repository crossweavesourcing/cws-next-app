"use client";

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Globe,
  LogOut,
  Monitor,
  FileText,
  Layers,
  Package,
  Navigation,
  Pause,
  ImageIcon,
  Palette,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useDashboardContext } from './DashboardContext';
import { PreviewPanel, StatusMiniCard } from './DashboardComponents';
import { UserAvatar } from './UserAvatar';
import type { UserRole, CmsPermission } from '@/types/auth';

const ALL_WORKSPACE_ITEMS: Array<{
  href: string;
  label: string;
  helper: string;
  icon: ComponentType<{ className?: string }>;
  permissionKey: CmsPermission | 'super_admin_only' | 'always' | 'users';
}> = [
  { href: '/dashboard', label: 'Overview', helper: 'CMS command center', icon: Monitor, permissionKey: 'overview' },
  { href: '/dashboard/page-content', label: 'Page Content', helper: 'Sections and page copy', icon: FileText, permissionKey: 'page_content' },
  { href: '/dashboard/categories', label: 'Categories', helper: 'Portfolio category cards', icon: Layers, permissionKey: 'categories' },
  { href: '/dashboard/products', label: 'Products', helper: 'Descriptions and media', icon: Package, permissionKey: 'products' },
  { href: '/dashboard/navigation', label: 'Navigation', helper: 'Header and footer links', icon: Navigation, permissionKey: 'super_admin_only' },
  { href: '/dashboard/visibility', label: 'Visibility', helper: 'Pause section controls', icon: Pause, permissionKey: 'super_admin_only' },
  { href: '/dashboard/media', label: 'Media Library', helper: 'Images and video slots', icon: ImageIcon, permissionKey: 'super_admin_only' },
  { href: '/dashboard/design', label: 'Design System', helper: 'Tokens and UI rules', icon: Palette, permissionKey: 'super_admin_only' },
  { href: '/dashboard/seo', label: 'SEO & Redirects', helper: 'Global meta and routing', icon: Globe, permissionKey: 'seo' },
  { href: '/dashboard/users', label: 'Users', helper: 'Manage CMS access', icon: Users, permissionKey: 'users' },
  { href: '/dashboard/account-security', label: 'Account & Security', helper: 'Profile, password and 2FA', icon: ShieldCheck, permissionKey: 'always' },
];

export function CmsDashboardLayoutClient({ 
  children,
  role,
  permissions,
  canManageUsers,
  userName,
  avatarUrl,
}: { 
  children: ReactNode;
  role: UserRole;
  permissions: CmsPermission[];
  canManageUsers: boolean;
  userName: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const isWideWorkspace = pathname?.startsWith('/dashboard/page-content') || pathname?.startsWith('/dashboard/account-security') || pathname?.startsWith('/dashboard/users');
  const {
    activeWorkspace,
    selectedPage,
    selectedProduct,
    selectedCategoryDraft,
    pausedSections,
    visibleSections,
    enabledNavIds,
  } = useDashboardContext();

  const workspaceItems = ALL_WORKSPACE_ITEMS.filter(item => {
    if (item.permissionKey === 'always') return true;
    if (item.permissionKey === 'super_admin_only') return role === 'super_admin';
    if (item.permissionKey === 'users') return canManageUsers;
    return role === 'super_admin' || permissions.includes(item.permissionKey);
  });

  // Find current workspace label based on URL
  const currentWorkspaceItem = workspaceItems.find(item => 
    item.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(item.href)
  );

  return (
    <main className="min-h-screen bg-[#EAEAEA] text-[#1E1E1E] font-sans antialiased selection:bg-[#E02424]/10 selection:text-[#E02424]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="bg-[#101010] text-white lg:sticky lg:top-0 lg:h-screen">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-6 py-6">
              <Link href="/" className="relative block h-14 w-44" aria-label="Back to CWS home">
                <Image src="/cws_logo.png" alt="CWS" fill priority sizes="176px" className="object-contain object-left" />
              </Link>
              
              <div className="mt-8 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <UserAvatar name={userName} avatarUrl={avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{userName}</div>
                  <div className="truncate text-[10px] font-bold uppercase tracking-wider text-[#E02424]">
                    {role.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5 scrollbar-thin scrollbar-thumb-white/10">
              {workspaceItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? 'border-[#E02424] bg-[#E02424] text-white'
                        : 'border-white/5 bg-white/[0.03] text-neutral-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center border ${isActive ? 'border-white/25 bg-black/15' : 'border-white/10 bg-black/20'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words text-xs font-bold uppercase tracking-[0.16em]">{item.label}</span>
                      <span className={`mt-1 block text-[11px] leading-relaxed ${isActive ? 'text-white/75' : 'text-neutral-500'}`}>
                        {item.helper}
                      </span>
                    </span>
                    <ChevronRight className={`h-4 w-4 ${isActive ? 'text-white' : 'text-neutral-600 group-hover:text-white'}`} />
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-6 space-y-4">
              <button
                type="button"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/dashboard/login';
                }}
                className="w-full flex items-center justify-center gap-2 border border-red-500/25 bg-red-500/5 hover:bg-[#E02424] hover:text-white transition-colors py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#E02424]"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
              <div className="grid grid-cols-2 gap-3 text-center">
                <StatusMiniCard label="Visible" value={String(visibleSections.length)} />
                <StatusMiniCard label="Paused" value={String(pausedSections.length)} tone="red" />
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <span className="break-words text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
                  Cross Weave Sourcing Admin
                </span>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-neutral-950 md:text-3xl">
                  {currentWorkspaceItem?.label ?? 'Dashboard'}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <span className="inline-flex min-h-10 w-full items-center justify-center gap-2 border border-neutral-200 bg-[#F9F9F9] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-600 sm:w-auto">
                  <CheckCircle2 className="h-4 w-4 text-[#E02424]" />
                  Draft UI
                </span>
                <Link
                  href="/"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 border border-neutral-900 bg-white px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-950 transition-colors hover:bg-neutral-950 hover:text-white sm:w-auto"
                >
                  Preview Site
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-10 w-full cursor-not-allowed items-center justify-center gap-2 bg-[#E02424]/45 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-white sm:w-auto"
                >
                  Publish Later
                </button>
              </div>
            </div>
          </header>

          <div className={`flex-1 grid grid-cols-1 gap-5 p-4 md:p-8 ${isWideWorkspace ? '' : '2xl:grid-cols-[minmax(0,1fr)_340px]'}`}>
            <div className="min-w-0 space-y-5">
              {children}
            </div>

            {!isWideWorkspace && <PreviewPanel
              activeWorkspace={activeWorkspace}
              selectedPage={selectedPage}
              selectedProduct={selectedProduct}
              selectedCategory={selectedCategoryDraft}
              pausedSections={pausedSections.length}
              visibleSections={visibleSections.length}
              enabledNavItems={enabledNavIds.size}
            />}
          </div>
        </section>
      </div>
    </main>
  );
}
