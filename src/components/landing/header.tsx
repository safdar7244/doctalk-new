"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Moon, Sun, Menu, X, FileText, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { name: "Features", href: "#features" },
    { name: "How it Works", href: "#how-it-works" },
    { name: "Pricing", href: "#pricing" },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200/10 bg-white/80 backdrop-blur-xl dark:bg-gray-950/80"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            DocTalk
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-8">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
            aria-label="Toggle theme"
          >
            {mounted && (
              <>
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                )}
              </>
            )}
          </button>

          {/* CTA Buttons */}
          <div className="hidden sm:flex sm:items-center sm:gap-3">
            {!isLoading && isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {user?.email}
                </span>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105"
                >
                  Dashboard
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Menu className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden border-t border-gray-200/10 bg-white/95 backdrop-blur-xl dark:bg-gray-950/95"
        >
          <div className="space-y-1 px-6 py-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                {item.name}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-4">
              {!isLoading && isAuthenticated ? (
                <>
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Signed in as {user?.email}
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-center text-base font-medium text-white shadow-lg shadow-violet-500/25"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-center text-base font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-center text-base font-medium text-white shadow-lg shadow-violet-500/25"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
