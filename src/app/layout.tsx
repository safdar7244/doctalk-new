import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocTalk - Chat with Your Documents | AI-Powered Document Intelligence",
  description:
    "Upload PDFs, Word docs, or any document and instantly get answers, summaries, and insights. Powered by advanced AI to understand and analyze your content.",
  keywords: [
    "document chat",
    "AI document analysis",
    "PDF chat",
    "document intelligence",
    "AI assistant",
  ],
  authors: [{ name: "DocTalk" }],
  openGraph: {
    title: "DocTalk - Chat with Your Documents",
    description:
      "Upload documents and get instant answers powered by AI. Transform how you work with documents.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
