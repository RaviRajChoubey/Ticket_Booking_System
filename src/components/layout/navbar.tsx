"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Ticket, Menu, X, LogOut, User, LayoutDashboard, Shield } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 shadow-lg shadow-black/40">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">

        {/* ── BRAND LOGO ── */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-900/50 group-hover:scale-105 transition-transform">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl sm:text-2xl tracking-tight gradient-text">
            TicketHub
          </span>
        </Link>

        {/* ── DESKTOP NAVIGATION ── */}
        <nav className="hidden md:flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            Events
          </Link>

          {(session?.user?.role === "ORGANISER" || session?.user?.role === "ADMIN") && (
            <Link
              href="/organiser/dashboard"
              className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-violet-400" />
              <span>Dashboard</span>
            </Link>
          )}

          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Admin</span>
            </Link>
          )}

          {session ? (
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-white/10">
              <Link
                href="/bookings"
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
              >
                <Ticket className="w-4 h-4 text-violet-400" />
                <span>My Tickets</span>
              </Link>

              {/* Profile Pill */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-sm font-medium text-violet-300">
                <User className="w-4 h-4 text-violet-400" />
                <span className="max-w-[140px] truncate">{session.user.name}</span>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-all shadow-md shadow-red-900/30"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 ml-2">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl transition-all shadow-md shadow-violet-900/40"
              >
                Get Started
              </Link>
            </div>
          )}
        </nav>

        {/* ── MOBILE MENU BUTTON ── */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ── MOBILE MENU DRAWER ── */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl px-6 py-5 space-y-3 animate-fade-in">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block py-2 text-base font-medium text-slate-200 hover:text-white"
          >
            Events
          </Link>
          {session ? (
            <>
              <Link
                href="/bookings"
                onClick={() => setOpen(false)}
                className="block py-2 text-base font-medium text-slate-200 hover:text-white"
              >
                My Tickets
              </Link>
              {(session.user.role === "ORGANISER" || session.user.role === "ADMIN") && (
                <Link
                  href="/organiser/dashboard"
                  onClick={() => setOpen(false)}
                  className="block py-2 text-base font-medium text-slate-200 hover:text-white"
                >
                  Dashboard
                </Link>
              )}
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="block py-2 text-base font-medium text-slate-200 hover:text-white"
                >
                  Admin Panel
                </Link>
              )}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">{session.user.name}</span>
                <button
                  onClick={() => {
                    signOut({ callbackUrl: "/" });
                    setOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="block text-center py-2 text-sm font-medium text-slate-200"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setOpen(false)}
                className="block text-center py-2.5 text-sm font-bold text-white bg-violet-600 rounded-xl"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
