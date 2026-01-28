import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import ChatWidget from "@/components/chat/ChatWidget";

export const metadata: Metadata = {
  title: "LocalServices - Find Trusted Local Service Providers",
  description: "Find and book trusted local service providers in your area. From plumbers to electricians, we connect you with the best professionals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          {children}
          <ChatWidget />
        </SessionProvider>
      </body>
    </html>
  );
}
