import type { Metadata } from 'next';
import './globals.css';
import './turbo.css';
import Providers from '@/components/providers';

export const metadata: Metadata = {
  title: 'TURBO by EmpowerTours',
  description: 'The launchpad to NITRO. Train. Build. Fund. A 12-month Web3 accelerator for LATAM founders on Monad.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
