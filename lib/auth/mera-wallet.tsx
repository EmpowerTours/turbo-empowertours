"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LocalAccount } from "viem";
import {
  createAccount,
  explainPasskeyError,
  signInAccount,
  type PasskeyAccount,
} from "./passkey";

// ---------------------------------------------------------------------------
// Mera passkey wallet for TURBO — the SAME wallet a player already has in Hunt.
//
// The passkey is bound to the relying party `empowertours.xyz` (NEXT_PUBLIC_RP_ID),
// and derive.ts uses Hunt's exact PRF salt, so a hunter who signs in here on
// turbo.empowertours.xyz gets the identical address they earn MON to in Hunt.
// `signIn` runs a DISCOVERABLE ceremony (no locally-known credential needed),
// which is what lets a Hunt user land on TURBO and recover their wallet with one
// Face ID. `create` is for a brand-new passkey (someone who never played Hunt).
//
// Nothing here touches a server: the key is derived, held in the page, and zeroed
// on sign out. Homework/claim only ever needs the ADDRESS.
// ---------------------------------------------------------------------------

interface MeraWallet {
  address: `0x${string}` | null;
  account: LocalAccount | null;
  signingIn: boolean;
  error: string | null;
  /** Discoverable sign-in — the common path for a returning Hunt player. */
  signIn: () => Promise<void>;
  /** Make a brand-new passkey + wallet (never played Hunt). */
  create: () => Promise<void>;
  signOut: () => void;
}

const MeraWalletContext = createContext<MeraWallet | null>(null);

export function MeraWalletProvider({ children }: { children: ReactNode }) {
  const [pk, setPk] = useState<PasskeyAccount | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<PasskeyAccount>) => {
    setSigningIn(true);
    setError(null);
    try {
      setPk(await fn());
    } catch (e) {
      setError(explainPasskeyError(e));
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setPk((prev) => {
      prev?.session.end();
      return null;
    });
    setError(null);
  }, []);

  const value = useMemo<MeraWallet>(
    () => ({
      address: pk ? (pk.account.address as `0x${string}`) : null,
      account: pk?.account ?? null,
      signingIn,
      error,
      signIn: () => run(signInAccount),
      create: () => run(createAccount),
      signOut,
    }),
    [pk, signingIn, error, run, signOut],
  );

  return (
    <MeraWalletContext.Provider value={value}>
      {children}
    </MeraWalletContext.Provider>
  );
}

export function useMeraWallet(): MeraWallet {
  const v = useContext(MeraWalletContext);
  if (v === null) {
    throw new Error("useMeraWallet must be used within a MeraWalletProvider");
  }
  return v;
}
