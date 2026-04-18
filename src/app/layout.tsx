import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ThreeStyle.ai — Trenuj freestyle z AI",
  description:
    "Pierwsza profesjonalna platforma freestyle'owa. Trenuj rymy, flow i punchline'y z trenerem AI w immersyjnym środowisku 3D.",
  keywords: ["freestyle", "rap", "AI coach", "3D arena", "hip-hop", "ThreeStyle"],
  authors: [{ name: "ThreeStyle.ai" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ThreeStyle",
  },
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
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
