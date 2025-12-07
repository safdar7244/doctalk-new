"use client";

import { motion } from "framer-motion";
import {
  FileText,
  MessageSquare,
  Zap,
  Shield,
  Search,
  BarChart3,
  Globe,
  Lock,
} from "lucide-react";

const features = [
  {
    name: "Multi-Format Support",
    description:
      "Upload PDFs, Word documents, text files, and more. Our AI understands them all seamlessly.",
    icon: FileText,
    gradient: "from-violet-500 to-purple-500",
  },
  {
    name: "Natural Conversations",
    description:
      "Ask questions in plain English and get accurate, contextual answers from your documents.",
    icon: MessageSquare,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Lightning Fast",
    description:
      "Get instant responses powered by cutting-edge AI. No waiting, no delays.",
    icon: Zap,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    name: "Enterprise Security",
    description:
      "Bank-level encryption and SOC 2 compliance. Your documents are safe with us.",
    icon: Shield,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    name: "Smart Search",
    description:
      "Find exactly what you need with AI-powered semantic search across all your documents.",
    icon: Search,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    name: "Analytics & Insights",
    description:
      "Get summaries, key points, and actionable insights automatically extracted.",
    icon: BarChart3,
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    name: "40+ Languages",
    description:
      "Upload documents in any language and chat in your preferred language.",
    icon: Globe,
    gradient: "from-teal-500 to-cyan-500",
  },
  {
    name: "Private & Secure",
    description:
      "Your data never trains our models. Complete privacy guaranteed.",
    icon: Lock,
    gradient: "from-red-500 to-pink-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function Features() {
  return (
    <section id="features" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
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
              Features
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white"
          >
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              understand your documents
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400"
          >
            Powerful features designed to help you extract maximum value from
            your documents with minimal effort.
          </motion.p>
        </div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.name}
              variants={itemVariants}
              className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
            >
              {/* Icon */}
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg`}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {feature.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>

              {/* Hover gradient effect */}
              <div
                className={`absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 blur-xl transition-opacity group-hover:opacity-10`}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
