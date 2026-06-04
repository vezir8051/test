import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import VerzeichnisClient from "@/components/VerzeichnisClient";

export const metadata: Metadata = {
  title: "Firmenverzeichnis – RecruiterPro",
  description:
    "Durchsuchbares Verzeichnis von Bau-, Handwerks- und Logistikbetrieben, die von Personalvermittlern kontaktiert werden möchten.",
};

export default function VerzeichnisPage() {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-gray-50 flex-1">
        <VerzeichnisClient />
      </main>
      <Footer />
    </>
  );
}
