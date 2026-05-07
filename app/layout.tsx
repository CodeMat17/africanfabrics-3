import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#009f3b" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1f12" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://afdguru.com"),
  title: {
    default: "AFD Guru — Tailoring Management",
    template: "%s | AFD Guru",
  },
  description:
    "Professional tailoring order and workflow management system for African fabric garments.",
  applicationName: "AFD Guru",
  authors: [{ name: "AFD Guru" }],
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AFD Guru",
  },
  openGraph: {
    type: "website",
    siteName: "AFD Guru",
    title: "AFD Guru — Tailoring Management",
    description:
      "Professional tailoring order and workflow management system for African fabric garments.",
    images: [{ url: "/logo/logo_name.webp", width: 330, height: 330, alt: "AFD Guru logo" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn("h-full", "antialiased", nunito.variable)}>
      <body className='min-h-full flex flex-col'>
      
          <ThemeProvider
            attribute='class'
            defaultTheme='system'
            enableSystem
            disableTransitionOnChange>
            <ClerkProvider>
              <ConvexClientProvider>{children}</ConvexClientProvider>
            </ClerkProvider>

            <Toaster />
            <PwaInstallPrompt />
          </ThemeProvider>
          <Script id="sw-register" strategy="afterInteractive">{`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js');
            }
          `}</Script>
      
      </body>
    </html>
  );
}
