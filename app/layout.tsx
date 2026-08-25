import type { Metadata } from "next";
import "./globals.css";
import "./mobile.css";

// The app is fully client-side after the initial shell. Keeping this static
// makes the same source deployable to the public Site and the Pages mirror.
export const dynamic = "force-static";

export const metadata: Metadata = {
  metadataBase: new URL("https://riffizer.ojertrejo.chatgpt.site"),
  title: "Riffizer — Guitar Riff Generator",
  description: "Generate, arrange, play, and export guitar-forward song riffs.",
  other: { "codex-preview": "development" },
  openGraph: {
    title: "Riffizer — Guitar Riff Generator",
    description: "Generate, arrange, play, and export guitar-forward song riffs.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Riffizer guitar riff generator" }],
  },
  twitter: { card: "summary_large_image", title: "Riffizer — Guitar Riff Generator", images: ["/og.png"] },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
