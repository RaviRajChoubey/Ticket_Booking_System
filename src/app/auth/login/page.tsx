"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Ticket, Loader2, CheckCircle2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered") === "true";
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlError = searchParams.get("error");
  const activeError = error || (urlError ? "Invalid email or password. Please check your credentials." : null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    const res = await signIn("credentials", {
      email: data.email.toLowerCase().trim(),
      password: data.password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="w-full max-w-md relative z-10 animate-fade-in">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-900/50">
          <Ticket className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold gradient-text">Welcome back</h1>
        <p className="text-slate-400 mt-1.5 text-sm">Sign in to your TicketHub account</p>
      </div>

      {/* Card */}
      <div className="glass rounded-2xl p-8 border border-white/10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {isRegistered && !activeError && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Account created successfully! Please sign in.</span>
            </div>
          )}

          {activeError && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">
              {activeError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <input
              {...register("email")}
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <input
                {...register("password")}
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Create one
          </Link>
        </p>
      </div>

      {/* Demo accounts */}
      <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-white/5">
        <p className="text-xs text-slate-500 text-center mb-2 font-medium">Demo Accounts</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { role: "Admin", email: "admin@demo.com" },
            { role: "Organiser", email: "org@demo.com" },
            { role: "Customer", email: "user@demo.com" },
          ].map(({ role, email }) => (
            <div key={role} className="text-xs">
              <span className="block text-slate-300 font-medium">{role}</span>
              <span className="text-slate-500">{email}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 text-center mt-2">Password: demo1234</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>
      <Suspense fallback={
        <div className="w-full max-w-md glass rounded-2xl p-8 border border-white/10 text-center">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
        </div>
      }>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
