import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://cekatan.com'),
  title: {
    default: "Cekatan",
    template: "%s - Cekatan",
  },
  description: "Platform asesmen & pemetaan kompetensi",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "Cekatan",
    title: "Cekatan",
    description: "Platform asesmen & pemetaan kompetensi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cekatan",
    description: "Platform asesmen & pemetaan kompetensi",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cekatan",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
      </head>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} antialiased bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen`}
      >
        <ThemeProvider>
          {children}
          <InstallBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
