import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'KitabGhar POS & Uniform ERP',
  description: 'Production-ready offline Windows desktop POS, inventory, uniform variant management, accounting, and billing system for stationery, school uniforms, school bags, and books.',
  openGraph: {
    title: 'KitabGhar POS & Uniform ERP',
    description: 'Production-ready offline Windows desktop POS, inventory, uniform variant management, accounting, and billing system for stationery, school uniforms, school bags, and books.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KitabGhar POS & Uniform ERP',
    description: 'Production-ready offline Windows desktop POS, inventory, uniform variant management, accounting, and billing system for stationery, school uniforms, school bags, and books.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
