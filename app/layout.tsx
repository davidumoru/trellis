import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { IconProvider } from "@/components/icon-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Trellis", template: "%s - Trellis" },
  description: "Your job hunt as a project, not a bookmark folder.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const stored = cookieStore.get("theme")?.value;
  const initialClass =
    stored === "light" ? "light" : stored === "system" ? "dark" : "dark";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${initialClass} h-full antialiased font-sans`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <IconProvider>{children}</IconProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
