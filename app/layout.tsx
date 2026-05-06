import type { Metadata, Viewport } from "next";
import { Nunito, Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "./providers";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans', display: 'swap'});

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
  title: {
    default: "AFD Guru — Tailoring Management",
    template: "%s | AFD Guru",
  },
  description:
    "Professional tailoring order and workflow management system for African fabric garments.",
  applicationName: "AFD Guru",
  authors: [{ name: "AFD Guru" }],
  robots: { index: true, follow: true },
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
      className={cn("h-full", "antialiased", nunito.variable, "font-sans", geist.variable)}>
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
          </ThemeProvider>
      
      </body>
    </html>
  );
}
