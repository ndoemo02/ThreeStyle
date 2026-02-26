import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "ThreeStyle.ai — Trenuj freestyle z AI",
  description:
    "Pierwsza profesjonalna platforma freestyle'owa. Trenuj rymy, flow i punchline'y z trenerem AI w immersyjnym środowisku 3D.",
  keywords: ["freestyle", "rap", "AI coach", "3D arena", "hip-hop", "ThreeStyle"],
  authors: [{ name: "ThreeStyle.ai" }],
  openGraph: {
    title: "ThreeStyle.ai — Trenuj freestyle z AI",
    description: "Trenuj z AI, wygrywaj z ludźmi. Platforma freestyle'owa nowej generacji.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
