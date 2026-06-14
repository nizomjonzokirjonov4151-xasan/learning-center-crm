import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/app/components/AppShell";
import ParentShell from "@/app/components/ParentShell";
import { getSession } from "@/lib/dal";
import { I18nProvider } from "@/lib/i18n/provider";

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
      <body className="min-h-screen">
        <I18nProvider>
          {session ? (
            session.role === "PARENT" ? (
              <ParentShell
                user={{ fullName: session.fullName, email: session.email }}
              >
                {children}
              </ParentShell>
            ) : (
              <AppShell
                user={{
                  fullName: session.fullName,
                  email: session.email,
                  role: session.role,
                }}
              >
                {children}
              </AppShell>
            )
          ) : (
            <main className="min-h-screen">{children}</main>
          )}
        </I18nProvider>
      </body>
    </html>
  );
}
