import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'Signal — Consent-First Identity Enrichment',
  description:
    'AI-powered visitor identity enrichment with consent-first privacy compliance. Discover verified professional contacts through ethical, transparent data enrichment.',
  keywords: 'identity enrichment, email discovery, consent-first, B2B intelligence, visitor intelligence',
  openGraph: {
    title: 'Signal — Consent-First Identity Enrichment',
    description: 'AI-powered visitor identity enrichment with consent-first privacy compliance.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
