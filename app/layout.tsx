import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/app/components/Sidebar";
import { getSession } from "@/lib/dal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "O'quv Markaz CRM",
  description: "Learning center management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={session ? "flex min-h-screen" : "min-h-screen"}>
        {session && (
          <Sidebar
            user={{
              fullName: session.fullName,
              email: session.email,
              role: session.role,
            }}
          />
        )}
        <main className={session ? "flex-1 min-w-0 overflow-x-hidden" : "flex-1"}>
          {children}
        </main>
      </body>
    </html>
  );
}
