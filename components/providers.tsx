'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { monad } from '@/lib/monad';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#06b6d4',
        },
        defaultChain: monad,
        supportedChains: [monad],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        externalWallets: {
          coinbaseWallet: {
            config: {
              preference: { options: 'eoaOnly' },
            },
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
