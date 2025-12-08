"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion } from "framer-motion";
import { FileText, Mail, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  confirmSignUpAction,
  confirmSignUpAndSignInAction,
  resendConfirmationCodeAction,
} from "@/app/actions/auth";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.push("/signup");
    }
  }, [email, router]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newCode = [...code];

    // Handle paste
    if (value.length > 1) {
      const pastedCode = value.slice(0, 6).split("");
      pastedCode.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);

      // Focus last filled input or next empty
      const lastIndex = Math.min(index + pastedCode.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCode = code.join("");

    if (verificationCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Check if we have the password for auto-login
      const tempPassword = sessionStorage.getItem("_temp_signup_pwd");

      if (tempPassword) {
        // Confirm and auto-login
        const result = await confirmSignUpAndSignInAction(
          email,
          verificationCode,
          tempPassword
        );

        // Clear the temporary password
        sessionStorage.removeItem("_temp_signup_pwd");

        if (result.success) {
          // Force a refresh to pick up the new cookies, then navigate
          router.refresh();
          router.push("/dashboard");
        } else {
          setError(result.error);
        }
      } else {
        // No password available, just confirm and redirect to login
        const result = await confirmSignUpAction(email, verificationCode);

        if (result.success) {
          router.push("/login?verified=true");
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

  const handleResendCode = async () => {
    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await resendConfirmationCodeAction(email);

      if (result.success) {
        setSuccess("A new verification code has been sent to your email.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950" />
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-r from-violet-400/30 to-indigo-400/30 blur-3xl dark:from-violet-600/20 dark:to-indigo-600/20" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-pink-400/20 to-rose-400/20 blur-3xl dark:from-pink-600/10 dark:to-rose-600/10" />
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

        {/* Verification card */}
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
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/20">
                <Mail className="h-7 w-7 text-violet-600 dark:text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Verify your email
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                We sent a verification code to
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {email}
              </p>
            </div>

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

            {/* Success message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-600 dark:bg-green-500/10 dark:text-green-400"
              >
                {success}
              </motion.div>
            )}

            {/* Verification form */}
            <form onSubmit={handleSubmit} className="mt-8">
              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                    className="h-12 w-12 rounded-lg border border-gray-300 bg-white text-center text-lg font-semibold text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || code.join("").length !== 6}
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify email
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Didn&apos;t receive the code?
              </p>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-400"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Resend code
                  </>
                )}
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              Wrong email?{" "}
              <Link
                href="/signup"
                className="font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
              >
                Go back to sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
