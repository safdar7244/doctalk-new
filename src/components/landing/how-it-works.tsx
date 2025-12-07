"use client";

import { motion } from "framer-motion";
import { Upload, Brain, MessageCircle, Lightbulb } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Upload Your Documents",
    description:
      "Drag and drop your PDFs, Word docs, or any text files. We support over 50 file formats.",
    icon: Upload,
    color: "violet",
  },
  {
    number: "02",
    title: "AI Processes Content",
    description:
      "Our advanced AI reads, understands, and indexes your documents in seconds.",
    icon: Brain,
    color: "indigo",
  },
  {
    number: "03",
    title: "Start a Conversation",
    description:
      "Ask questions naturally. Get accurate, contextual answers instantly.",
    icon: MessageCircle,
    color: "purple",
  },
  {
    number: "04",
    title: "Get Actionable Insights",
    description:
      "Discover hidden patterns, get summaries, and extract key information effortlessly.",
    icon: Lightbulb,
    color: "pink",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-violet-50 dark:from-gray-950 dark:to-gray-900" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-gradient-to-t from-violet-400/20 to-transparent blur-3xl dark:from-violet-600/10" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center rounded-full bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 ring-1 ring-inset ring-violet-700/10 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20">
              How It Works
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white"
          >
            From upload to{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              insights in minutes
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400"
          >
            Four simple steps to unlock the power of your documents.
          </motion.p>
        </div>

        {/* Steps */}
        <div className="mt-20">
          <div className="relative">
            {/* Connection line */}
            <div className="absolute left-1/2 top-0 hidden h-full w-0.5 -translate-x-1/2 bg-gradient-to-b from-violet-500 via-indigo-500 to-purple-500 lg:block" />

            <div className="space-y-12 lg:space-y-0">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative flex flex-col lg:flex-row ${
                    index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  } items-center gap-8 lg:gap-16`}
                >
                  {/* Content */}
                  <div
                    className={`flex-1 ${
                      index % 2 === 0 ? "lg:text-right" : "lg:text-left"
                    }`}
                  >
                    <div className="inline-block">
                      <span className="text-6xl font-bold text-gray-100 dark:text-gray-800">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-md inline-block">
                      {step.description}
                    </p>
                  </div>

                  {/* Icon */}
                  <div className="relative z-10 flex h-20 w-20 items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-xl shadow-violet-500/25" />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 blur-xl opacity-50" />
                    <step.icon className="relative z-10 h-10 w-10 text-white" />
                  </div>

                  {/* Empty space for alignment */}
                  <div className="hidden flex-1 lg:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
