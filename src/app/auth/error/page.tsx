"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (err: string | null) => {
    switch (err) {
      case "CredentialsSignin":
        return "Invalid email or password. Please check your credentials and try again.";
      case "SessionRequired":
        return "You must be signed in to access this page.";
      case "AccessDenied":
        return "Access denied. You do not have permission to view this resource.";
      default:
        return "An authentication error occurred. Please try signing in again.";
    }
  };

  return (
    <div className="w-full max-w-md glass rounded-2xl p-8 border border-white/10 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">Authentication Error</h1>
        <p className="text-sm text-slate-300 mt-2">{getErrorMessage(error)}</p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Link
          href="/auth/login"
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Signing In Again</span>
        </Link>
        <Link
          href="/"
          className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Home</span>
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 py-12">
      <Suspense fallback={
        <div className="w-full max-w-md glass rounded-2xl p-8 border border-white/10 text-center">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
        </div>
      }>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
