import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseEventLogs,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad } from '@/lib/monad';
import { getCountryByCode } from '@/lib/passport/countries';
import {
  generatePassportMetadata,
  isValidCountryCode,
} from '@/lib/passport/generatePassportSVG';

const PASSPORT_ADDRESS = '0x93126e59004692b01961be505aa04f55d5bd1851' as const;

const PASSPORT_MINT_ABI = [
  {
    inputs: [
      { name: 'beneficiary', type: 'address' },
      { name: 'userFid', type: 'uint256' },
      { name: 'countryCode', type: 'string' },
      { name: 'countryName', type: 'string' },
      { name: 'region', type: 'string' },
      { name: 'continent', type: 'string' },
      { name: 'uri', type: 'string' },
    ],
    name: 'mintFor',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'userFid', type: 'uint256' },
      { indexed: false, name: 'countryCode', type: 'string' },
      { indexed: false, name: 'countryName', type: 'string' },
      { indexed: false, name: 'region', type: 'string' },
      { indexed: false, name: 'continent', type: 'string' },
      { indexed: false, name: 'verified', type: 'bool' },
    ],
    name: 'PassportMinted',
    type: 'event',
  },
] as const;

const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    // --- Parse & validate request body ---
    const body = await request.json();
    const { userAddress, countryCode } = body as {
      userAddress: string;
      countryCode: string;
    };

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid or missing userAddress' },
        { status: 400 }
      );
    }

    if (!countryCode || !isValidCountryCode(countryCode)) {
      return NextResponse.json(
        { error: 'Invalid or missing countryCode' },
        { status: 400 }
      );
    }

    // --- IP geo-verification (optional) ---
    const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
    if (IPINFO_TOKEN) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const ip = forwarded?.split(',')[0]?.trim() || realIp || null;

      if (ip) {
        try {
          const geoRes = await fetch(
            `https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`
          );
          if (geoRes.ok) {
            const geoData = (await geoRes.json()) as { country?: string };
            const ipCountry = geoData.country?.toUpperCase();
            const requestedCode = countryCode.toUpperCase();

            if (ipCountry && ipCountry !== requestedCode) {
              // Allow HK/CN override: users in HK can mint CN and vice versa
              const hkCnSet = new Set(['HK', 'CN']);
              const isHkCnOverride =
                hkCnSet.has(ipCountry) && hkCnSet.has(requestedCode);

              if (!isHkCnOverride) {
                return NextResponse.json(
                  {
                    error: `Country mismatch: your IP is in ${ipCountry} but you requested ${requestedCode}`,
                  },
                  { status: 403 }
                );
              }
            }
          }
        } catch {
          // IP verification failed silently - continue without blocking
          console.warn('IP geo-verification failed, skipping check');
        }
      }
    }

    // --- On-chain duplicate check ---
    const balance = await publicClient.readContract({
      address: PASSPORT_ADDRESS,
      abi: PASSPORT_MINT_ABI,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`],
    });

    if (Number(balance) > 0) {
      return NextResponse.json(
        { error: 'User already owns a passport NFT' },
        { status: 409 }
      );
    }

    // --- Get full country info ---
    const country = getCountryByCode(countryCode);
    if (!country) {
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 400 }
      );
    }

    const { code, name, flag, region, continent } = country;

    // --- Generate metadata ---
    const metadata = generatePassportMetadata(code, name, 0);

    // --- Upload metadata JSON to Pinata IPFS ---
    const PINATA_JWT = process.env.PINATA_JWT;
    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing PINATA_JWT' },
        { status: 500 }
      );
    }

    const pinataRes = await fetch(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `passport-${code}-${userAddress.slice(0, 8)}`,
          },
        }),
      }
    );

    if (!pinataRes.ok) {
      const pinataError = await pinataRes.text();
      console.error('Pinata upload failed:', pinataError);
      return NextResponse.json(
        { error: 'Failed to upload metadata to IPFS' },
        { status: 502 }
      );
    }

    const pinataData = (await pinataRes.json()) as { IpfsHash: string };
    const ipfsUri = `ipfs://${pinataData.IpfsHash}`;

    // --- Create deployer wallet & send mint transaction ---
    const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
    if (!DEPLOYER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing DEPLOYER_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    const account = privateKeyToAccount(
      DEPLOYER_PRIVATE_KEY as `0x${string}`
    );

    const walletClient = createWalletClient({
      account,
      chain: monad,
      transport: http(),
    });

    const txHash = await walletClient.writeContract({
      address: PASSPORT_ADDRESS,
      abi: PASSPORT_MINT_ABI,
      functionName: 'mintFor',
      args: [
        userAddress as `0x${string}`,
        BigInt(0),
        code,
        name,
        region,
        continent,
        ipfsUri,
      ],
    });

    // --- Wait for receipt ---
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    // --- Parse PassportMinted event for tokenId ---
    let tokenId: string | null = null;

    const events = parseEventLogs({
      abi: PASSPORT_MINT_ABI,
      logs: receipt.logs,
      eventName: 'PassportMinted',
    });

    if (events.length > 0) {
      const event = events[0];
      tokenId = (event.args as { tokenId: bigint }).tokenId.toString();
    }

    return NextResponse.json({
      success: true,
      txHash,
      tokenId,
      country: {
        code,
        name,
        flag,
        region,
        continent,
      },
    });
  } catch (error: unknown) {
    console.error('Passport mint error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Mint failed: ${message}` },
      { status: 500 }
    );
  }
}
