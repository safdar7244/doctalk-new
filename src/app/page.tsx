import {
  Header,
  Hero,
  Features,
  HowItWorks,
  Pricing,
  CTA,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
