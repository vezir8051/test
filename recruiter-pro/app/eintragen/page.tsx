import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import EintragenClient from "@/components/EintragenClient";

export const metadata: Metadata = {
  title: "Firma eintragen – RecruiterPro",
  description:
    "Tragen Sie Ihren Bau-, Handwerks- oder Logistikbetrieb kostenlos ein und werden Sie von passenden Personalvermittlern gefunden.",
};

export default function EintragenPage() {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-gray-50 flex-1">
        <EintragenClient />
      </main>
      <Footer />
    </>
  );
}
