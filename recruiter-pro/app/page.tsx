import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Comparison from "@/components/Comparison";
import Pricing from "@/components/Pricing";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <Comparison />
      <Pricing />
      <Contact />
      <Footer />
    </main>
  );
}
