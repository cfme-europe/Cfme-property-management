import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import UitloggenLink from "@/components/auth/UitloggenLink";
import { createClient } from "@/lib/supabase/server";
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
  title: "CFME Control",
  description: "Vastgoed- en facilitymanagement voor CFME",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-20">
        {children}

        {user && (
          <div className="fixed bottom-4 right-4 z-50">
            <UitloggenLink />
          </div>
        )}
      </body>
    </html>
  );
}
