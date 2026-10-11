'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  LayoutDashboard,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  ChevronDown,
  Sparkles,
  GraduationCap,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  community_joined: boolean;
  isAdmin: boolean;
}

let cachedNavbarUser: CurrentUser | null = null;
let lastNavbarAuthCheck = 0;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(cachedNavbarUser);
  const [loading, setLoading] = useState(!cachedNavbarUser);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [profileDropdownOpen]);

  useEffect(() => {
    const now = Date.now();
    // Fast path: if user checked within last 45 seconds, keep active without network overhead
    if (cachedNavbarUser && now - lastNavbarAuthCheck < 45000) {
      setUser(cachedNavbarUser);
      setLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            cachedNavbarUser = data.user;
            lastNavbarAuthCheck = Date.now();
            setUser(data.user);
          } else {
            cachedNavbarUser = null;
            setUser(null);
          }
        } else {
          cachedNavbarUser = null;
          setUser(null);
        }
      } catch (e) {
        cachedNavbarUser = null;
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    cachedNavbarUser = null;
    lastNavbarAuthCheck = 0;
    try {
      // 1. Call server-side logout to clear session and Supabase cookies
      await fetch('/api/auth/logout', { method: 'POST' });

      // 2. Invalidate Supabase client session if available
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        if (supabase) {
          await supabase.auth.signOut();
        }
      } catch (clientErr) {
        // Silently continue if client is not configured
      }

      // 3. Purge browser client-side storage
      try {
        if (typeof window !== 'undefined') {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
              localStorage.removeItem(key);
            }
          });
          sessionStorage.clear();
        }
      } catch (storageErr) {}

      setUser(null);

      // 4. Hard navigate to /login to flush all React and router state
      window.location.href = '/login';
    } catch (e) {
      console.error('Logout error', e);
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-md dark:border-neutral-800 dark:bg-[#0a0a0a]/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Brand Logo & Wordmark */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="flex h-8 w-8 items-center justify-center text-orange-500 dark:text-orange-400 transition-transform duration-200 group-hover:scale-105">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 fill-orange-500/20 text-orange-500 dark:text-orange-400"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                CampusConnect <span className="text-orange-600 dark:text-orange-500 font-extrabold">LPU</span>
              </span>
              <Badge
                variant="secondary"
                className="hidden xl:inline-flex bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                Study Hub
              </Badge>
            </div>
          </Link>

          {/* Center: Desktop Navigation Links via NavigationMenu */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList className="gap-1 lg:gap-2">
                {/* Home */}
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/"
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                        pathname === "/"
                          ? "text-neutral-950 dark:text-white bg-neutral-100 dark:bg-neutral-800/80 font-semibold"
                          : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                      )}
                    >
                      Home
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {/* Dashboard (Authenticated) */}
                {user && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/dashboard"
                        className={cn(
                          "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                          pathname === "/dashboard"
                            ? "text-neutral-950 dark:text-white bg-neutral-100 dark:bg-neutral-800/80 font-semibold"
                            : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                        )}
                      >
                        Dashboard
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}

                {/* Study Materials Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={cn(
                      "rounded-full bg-transparent px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:hover:text-white data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800/60",
                      pathname.startsWith('/library')
                        ? "text-neutral-950 dark:text-white bg-neutral-100 dark:bg-neutral-800/80 font-semibold"
                        : "text-neutral-600 dark:text-neutral-300"
                    )}
                  >
                    Study Materials
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[380px] gap-2 p-3 sm:w-[460px] md:w-[500px] md:grid-cols-2 rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-[#0f0f0f]">
                      <li className="md:col-span-2">
                        <NavigationMenuLink asChild>
                          <Link
                            href="/library"
                            className="flex flex-col gap-1 rounded-xl p-3 bg-neutral-50 dark:bg-neutral-900/70 hover:bg-neutral-100 dark:hover:bg-neutral-800/90 transition-colors border border-neutral-200/60 dark:border-neutral-800"
                          >
                            <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900 dark:text-white">
                              <BookOpen className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                              All Study Materials
                              <Badge className="ml-auto bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Browse All
                              </Badge>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Access all year-wise subject notes, syllabus, and study resources
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/library?type=PYQs"
                            className="block select-none space-y-1 rounded-xl p-2.5 leading-none no-underline outline-none transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                          >
                            <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                              Previous Year Papers
                            </div>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Mid-term & end-term PYQs
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/library?type=Notes"
                            className="block select-none space-y-1 rounded-xl p-2.5 leading-none no-underline outline-none transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                          >
                            <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                              Curated Notes
                            </div>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Handwritten & lecture notes
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Members / Community */}
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/community"
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                        pathname === "/community"
                          ? "text-neutral-950 dark:text-white bg-neutral-100 dark:bg-neutral-800/80 font-semibold"
                          : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                      )}
                    >
                      Community
                      <Badge
                        variant="secondary"
                        className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] font-bold px-1.5 py-0 rounded-full"
                      >
                        LPU
                      </Badge>
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {/* Admin (Only if Admin) */}
                {user?.isAdmin && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/admin"
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                          pathname.startsWith('/admin')
                            ? "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 font-semibold"
                            : "text-neutral-600 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                        )}
                      >
                        Admin
                        <span className="text-[10px] bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.2 rounded-full border border-red-200 dark:border-red-800/60">
                          Panel
                        </span>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>

        {/* Right: Actions / Auth / Theme Toggle */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          {!loading && user ? (
            /* Logged-In User Profile Menu */
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 py-1 px-1.5 pr-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 transition-all focus:outline-none"
                aria-label="User Profile Menu"
              >
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-orange-500/40 bg-neutral-100 dark:bg-neutral-800"
                />
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-tight">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {user.community_joined ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Community Member
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Join Community Required
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    >
                      <LayoutDashboard className="w-4 h-4 text-neutral-400" />
                      My Dashboard
                    </Link>
                    <Link
                      href="/library"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    >
                      <BookOpen className="w-4 h-4 text-neutral-400" />
                      Browse Study Materials
                    </Link>
                    <Link
                      href="/community"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    >
                      <Users className="w-4 h-4 text-neutral-400" />
                      Community & Directory
                    </Link>
                    {user.isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <ShieldCheck className="w-4 h-4 text-red-500" />
                        Admin Portal
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-neutral-100 dark:border-neutral-800 pt-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : !loading ? (
            /* Logged-Out Actions: Sign In & Site Theme Orange Pill CTA */
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-full px-3.5 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm px-5 py-2 shadow-sm shadow-orange-500/25 transition-all duration-200 active:scale-95"
              >
                Get started
              </Link>
            </div>
          ) : null}
        </div>

        {/* Mobile / Tablet View via Sheet */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-xl text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-[300px] sm:w-[380px] flex-col gap-6 border-l border-neutral-200 bg-white p-6 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 overflow-y-auto"
            >
              {/* Brand Header */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center text-orange-500 dark:text-orange-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 fill-orange-500/20 text-orange-500 dark:text-orange-400"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                  CampusConnect <span className="text-orange-600 dark:text-orange-500 font-extrabold">LPU</span>
                </span>
              </div>

              {/* Logged in User Card in Mobile Drawer */}
              {user && (
                <div className="rounded-xl border border-neutral-200 p-3 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border border-orange-500/40 object-cover"
                    />
                    <div className="truncate">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                      <div className="mt-1">
                        {user.community_joined ? (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            Community Member ✓
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            Join Community Required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <div className="flex flex-col gap-1">
                <Link
                  href="/"
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "block py-2 text-base font-medium transition-colors rounded-lg px-2",
                    pathname === "/"
                      ? "text-orange-600 dark:text-orange-400 font-semibold bg-neutral-100 dark:bg-neutral-900"
                      : "text-neutral-900 hover:text-orange-600 dark:text-neutral-200 dark:hover:text-orange-400"
                  )}
                >
                  Home
                </Link>

                {user && (
                  <Link
                    href="/dashboard"
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      "block py-2 text-base font-medium transition-colors rounded-lg px-2",
                      pathname === "/dashboard"
                        ? "text-orange-600 dark:text-orange-400 font-semibold bg-neutral-100 dark:bg-neutral-900"
                        : "text-neutral-900 hover:text-orange-600 dark:text-neutral-200 dark:hover:text-orange-400"
                    )}
                  >
                    Dashboard
                  </Link>
                )}

                {/* Mobile Accordion for Study Materials */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="study-materials" className="border-none">
                    <AccordionTrigger className="py-2 px-2 text-base font-medium text-neutral-900 no-underline transition-colors hover:no-underline dark:text-neutral-200 hover:text-orange-600 dark:hover:text-orange-400">
                      Study Materials
                    </AccordionTrigger>
                    <AccordionContent className="mt-1 ml-2 flex flex-col gap-2 border-l border-neutral-200 pb-2 pl-4 dark:border-neutral-800 [&_a]:no-underline">
                      <Link
                        href="/library"
                        onClick={() => setSheetOpen(false)}
                        className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400"
                      >
                        All Materials
                      </Link>
                      <Link
                        href="/library?type=PYQs"
                        onClick={() => setSheetOpen(false)}
                        className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400"
                      >
                        Previous Year Papers (PYQs)
                      </Link>
                      <Link
                        href="/library?type=Notes"
                        onClick={() => setSheetOpen(false)}
                        className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400"
                      >
                        Curated Lecture Notes
                      </Link>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Link
                  href="/community"
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "flex items-center justify-between py-2 text-base font-medium transition-colors rounded-lg px-2",
                    pathname === "/community"
                      ? "text-orange-600 dark:text-orange-400 font-semibold bg-neutral-100 dark:bg-neutral-900"
                      : "text-neutral-900 hover:text-orange-600 dark:text-neutral-200 dark:hover:text-orange-400"
                  )}
                >
                  Community & Members
                  <Badge
                    variant="secondary"
                    className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] font-bold"
                  >
                    WhatsApp
                  </Badge>
                </Link>

                {user?.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      "flex items-center justify-between py-2 text-base font-medium transition-colors rounded-lg px-2",
                      pathname.startsWith('/admin')
                        ? "text-red-600 font-semibold bg-red-50 dark:bg-red-950/40"
                        : "text-neutral-900 hover:text-red-600 dark:text-neutral-200"
                    )}
                  >
                    Admin Portal
                    <Badge variant="destructive" className="text-[10px]">
                      Admin
                    </Badge>
                  </Link>
                )}
              </div>

              {/* Bottom Drawer Actions */}
              <div className="mt-auto flex flex-col gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
                {user ? (
                  <button
                    onClick={() => {
                      setSheetOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full border border-rose-200 dark:border-rose-900/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setSheetOpen(false)}
                      className="w-full py-2.5 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setSheetOpen(false)}
                      className="w-full py-2.5 text-center text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full shadow-sm shadow-orange-500/25"
                    >
                      Get started
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}
