import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "ST Carpool",
  description: "Internal carpooling tool for STMicroelectronics employees",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClientProviders>
            {children}
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
