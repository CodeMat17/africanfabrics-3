import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "./providers";

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
  openGraph: {
    type: "website",
    title: "AFD Guru — Tailoring Management",
    description:
      "Professional tailoring order and workflow management system for African fabric garments.",
    siteName: "AFD Guru",
  },
  twitter: {
    card: "summary",
    title: "AFD Guru — Tailoring Management",
    description:
      "Professional tailoring order and workflow management system for African fabric garments.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
