import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/contexts/auth-context";
import { QueryProvider } from "@/contexts/query-provider";
import { TeamProvider } from "@/contexts/team-context";
import { TeamTabProvider } from "@/contexts/team-tab-context";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClannAi Theme",
  description: "Next.js with Shadcn/ui components featuring the custom ClannAi color palette",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <QueryProvider>
            <TeamProvider>
              <TeamTabProvider>
                {children}
                <Toaster />
              </TeamTabProvider>
            </TeamProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
