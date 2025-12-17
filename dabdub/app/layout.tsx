import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DabDub',
  description: 'A multi-chain settlement infrastructure that bridges Web3 payments with traditional banking, enabling merchants to accept stablecoin payments and receive instant fiat settlements.',
   viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DabDub',
  },
  // icons: {
  //   apple: '/icon-192x192.png',
  // },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}