"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInAction } from "@/app/actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Check for success messages from redirects
  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setSuccessMessage("Email verified successfully! You can now sign in.");
    } else if (searchParams.get("registered") === "true") {
      setSuccessMessage("Account created successfully! Please sign in.");
    } else if (searchParams.get("password_reset") === "true") {
      setSuccessMessage("Password reset successfully! Please sign in with your new password.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      console.log("Attempting to sign in with", formData.email);
      const result = await signInAction(formData.email, formData.password);
      console.log("Sign in result:", result);

      if (result.success) {
        // Force refresh to pick up new cookies, then navigate
        router.refresh();
        router.push("/dashboard");
      } else {
        // Check if user needs to verify email
        if (result.error.includes("verify your email")) {
          router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
        } else {
          setError(result.error);
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950" />
        <div className="absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-r from-violet-400/30 to-indigo-400/30 blur-3xl dark:from-violet-600/20 dark:to-indigo-600/20" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-3xl dark:from-blue-600/10 dark:to-cyan-600/10" />
      </div>

      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              DocTalk
            </span>
          </Link>
        </motion.div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="relative rounded-2xl border border-gray-200/50 bg-white/80 p-8 shadow-xl backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/80">
            {/* Glow effect */}
            <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-purple-600/20 blur-xl" />

            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Sign in to your DocTalk account
              </p>
            </div>

            {/* Success message */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-600 dark:bg-green-500/10 dark:text-green-400"
              >
                <CheckCircle className="h-5 w-5 shrink-0" />
                {successMessage}
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400"
              >
                {error}
              </motion.div>
            )}

            {/* Social login buttons */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email address
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-violet-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-violet-500"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-800"
                />
                <label
                  htmlFor="remember"
                  className="ml-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  Remember me for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
