"use client";

import { motion } from "framer-motion";
import { ArrowRight, Upload, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-32 pb-20">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-r from-violet-400/30 to-indigo-400/30 blur-3xl dark:from-violet-600/20 dark:to-indigo-600/20" />
        <div className="absolute top-1/4 right-0 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-pink-400/20 to-rose-400/20 blur-3xl dark:from-pink-600/10 dark:to-rose-600/10" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-3xl dark:from-blue-600/10 dark:to-cyan-600/10" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400"
          >
            <Sparkles className="h-4 w-4" />
            AI-Powered Document Intelligence
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl dark:text-white"
          >
            Chat with your{" "}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              documents
            </span>{" "}
            like never before
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400 sm:text-xl"
          >
            Upload PDFs, Word docs, or any document and instantly get answers,
            summaries, and insights. Powered by advanced AI to understand and
            analyze your content.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#how-it-works"
              className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
            >
              See How It Works
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 flex flex-col items-center gap-4 text-sm text-gray-500 dark:text-gray-500"
          >
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1">
                <span className="text-green-500">&#10003;</span> No credit card required
              </span>
              <span className="flex items-center gap-1">
                <span className="text-green-500">&#10003;</span> 14-day free trial
              </span>
              <span className="flex items-center gap-1">
                <span className="text-green-500">&#10003;</span> Cancel anytime
              </span>
            </div>
          </motion.div>
        </div>

        {/* Hero visual/mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 relative"
        >
          <div className="relative mx-auto max-w-5xl">
            {/* Glow effect */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-purple-600/20 blur-2xl" />

            {/* Main mockup container */}
            <div className="relative rounded-2xl border border-gray-200/50 bg-white/80 p-2 shadow-2xl backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/80">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-950 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="rounded-lg bg-gray-100 px-4 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      doctalk.ai/chat
                    </div>
                  </div>
                </div>

                {/* App content mockup */}
                <div className="grid md:grid-cols-3 min-h-[400px]">
                  {/* Sidebar */}
                  <div className="border-r border-gray-200 p-4 dark:border-gray-800">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-lg bg-violet-50 p-3 dark:bg-violet-500/10">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/20">
                          <Upload className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Q3 Report.pdf</div>
                          <div className="text-xs text-gray-500">24 pages</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                          <Upload className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Contract.docx</div>
                          <div className="text-xs text-gray-500">12 pages</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat area */}
                  <div className="md:col-span-2 flex flex-col p-4">
                    <div className="flex-1 space-y-4">
                      {/* User message */}
                      <div className="flex justify-end">
                        <div className="max-w-xs rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-2 text-sm text-white">
                          What were the key highlights from Q3?
                        </div>
                      </div>
                      {/* AI response */}
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600">
                          <MessageSquare className="h-4 w-4 text-white" />
                        </div>
                        <div className="max-w-sm rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          Based on your Q3 report, here are the key highlights:
                          <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                            <li>Revenue increased 23% YoY</li>
                            <li>Customer acquisition up 45%</li>
                            <li>New market expansion in APAC</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    {/* Input */}
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
                      <input
                        type="text"
                        placeholder="Ask anything about your document..."
                        className="flex-1 bg-transparent px-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white"
                        disabled
                      />
                      <button className="rounded-lg bg-violet-600 p-2 text-white">
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
