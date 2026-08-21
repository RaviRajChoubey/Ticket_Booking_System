"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Ticket, Menu, X, LogOut, User, LayoutDashboard, Shield } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center group-hover:bg-violet-500 transition-colors">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">TicketHub</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">Events</Link>
            {session?.user?.role === "ORGANISER" || session?.user?.role === "ADMIN" ? (
              <Link href="/organiser/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
            ) : null}
            {session?.user?.role === "ADMIN" && (
              <Link href="/admin" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                <Shield className="w-4 h-4" /> Admin
              </Link>
            )}
            {session ? (
              <div className="flex items-center gap-3">
                <Link href="/bookings" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                  <Ticket className="w-4 h-4" /> My Tickets
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <User className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-sm text-slate-300">{session.user.name}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-500 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fade-in">
          <Link href="/" className="block py-2 text-slate-300 hover:text-white" onClick={() => setOpen(false)}>Events</Link>
          {session ? (
            <>
              <Link href="/bookings" className="block py-2 text-slate-300 hover:text-white" onClick={() => setOpen(false)}>My Tickets</Link>
              {(session.user.role === "ORGANISER" || session.user.role === "ADMIN") && (
                <Link href="/organiser/dashboard" className="block py-2 text-slate-300 hover:text-white" onClick={() => setOpen(false)}>Dashboard</Link>
              )}
              <button
                onClick={() => { signOut({ callbackUrl: "/" }); setOpen(false); }}
                className="block w-full text-left py-2 text-red-400 hover:text-red-300"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="block py-2 text-slate-300 hover:text-white" onClick={() => setOpen(false)}>Login</Link>
              <Link href="/auth/register" className="block py-2 text-violet-400 hover:text-violet-300" onClick={() => setOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
