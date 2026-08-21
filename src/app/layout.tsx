import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TicketHub — Book Movies & Concerts",
  description:
    "Book tickets for movies and concerts with real-time seat maps, instant QR code tickets, and smart waitlists.",
  keywords: ["ticket booking", "movies", "concerts", "seat map", "events"],
  openGraph: {
    title: "TicketHub",
    description: "Book tickets for movies and concerts",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[hsl(222,47%,6%)] text-white font-sans antialiased">
        <Providers>
          <Navbar />
          <main className="pt-16 sm:pt-20">{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
