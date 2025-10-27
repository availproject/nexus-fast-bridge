import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/providers/web3Provider";
import { Toaster } from "sonner";
import Navbar from "@/components/navbar";
import NexusProvider from "@/components/nexus/NexusProvider";
import config from "../../config";
import { NexusNetwork } from "@avail-project/nexus-core";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: config.appTitle,
  description: config.appDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3Provider>
          <NexusProvider
            config={{
              network: config.nexusNetwork as NexusNetwork,
              debug: true,
            }}
          >
            <Navbar />
            <Toaster />
            {children}
          </NexusProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
