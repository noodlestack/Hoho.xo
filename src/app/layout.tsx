import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import {
  Caveat,
  Instrument_Serif,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  display: "swap",
});

const handwriting = Caveat({
  variable: "--font-handwriting",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  display: "swap",
});

const siteUrl = (() => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (
        parsed.hostname !== "your-domain.example" &&
        parsed.origin !== "https://hoho.xo"
      ) {
        return parsed;
      }
    } catch {
      // Ignore invalid URL
    }
  }
  return process.env.NODE_ENV !== "production"
    ? new URL("http://localhost:3000")
    : undefined;
})();

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  title: "Hoho.xo — Anonymous Christmas Tree & QR Notes",
  description:
    "Share a 3D ASCII Christmas tree link in your bio or Story. Friends send anonymous notes that hang as ornaments.",
  authors: [{ name: "noodlestack" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Hoho.xo — Anonymous Christmas Tree & QR Notes",
    description:
      "Share a 3D ASCII Christmas tree link in your bio or Story. Friends send anonymous notes that hang as ornaments.",
    siteName: "Hoho.xo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hoho.xo — Anonymous Christmas Tree & QR Notes",
    description:
      "Share a 3D ASCII Christmas tree link in your bio or Story. Friends send anonymous notes that hang as ornaments.",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0B0D12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable} ${handwriting.variable}`}
    >
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "#121620",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#F6F2E9",
            },
          }}
        />
      </body>
    </html>
  );
}
