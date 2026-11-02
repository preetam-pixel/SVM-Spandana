import type { Metadata, Viewport } from "next";
import { Noto_Sans_Kannada, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/Toaster";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-playfair" });
const kannada = Noto_Sans_Kannada({ subsets: ["kannada"], weight: ["400", "600", "700"], variable: "--font-kannada" });

export const metadata: Metadata = {
  title: "SVM Spandana — Find your art. Find your people.",
  description: "Intelligent talent discovery and engagement ecosystem for Sangeet Vrinda x Madhyam (SVM), KLE Institute of Technology.",
  icons: { icon: "/svm-logo.png" },
};

export const viewport: Viewport = { themeColor: "#f6efe2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${playfair.variable} ${kannada.variable}`}>
      <body className="font-sans antialiased">
        <StoreProvider>
          {children}
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
