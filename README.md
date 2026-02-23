# TURBO by EmpowerTours

**Live:** [https://turbo-empowertours-production.up.railway.app](https://turbo-empowertours-production.up.railway.app/)

TURBO is a 12-month Web3 accelerator for LATAM founders, built on [Monad](https://monad.xyz). Members pay monthly via the TurboCohort smart contract, complete a 52-week curriculum, and earn TOURS tokens for homework completions.

## Features

- **TurboCohort V6** — Soulbound NFT membership with tiered pricing (Explorer/Builder/Founder)
- **52-Week Homework System** — GitHub-integrated curriculum from dev basics to startup building
- **On-chain Governance** — Council-based proposal system for founder selection
- **EmpowerTours Passport** — Country-specific soulbound identity NFTs
- **TOURS Token Rewards** — Earn tokens for weekly homework completions + milestone bonuses

## Stack

- **Frontend:** Next.js 15, React, Tailwind CSS, Privy auth
- **Chain:** Monad (Chain ID 143)
- **Data:** Upstash Redis
- **Deploy:** Railway

## Contracts (Monad Mainnet)

| Contract | Address |
|----------|---------|
| TurboCohortV6 | `0xEae06514a0d3daf610cC0778B27f387018521Ab5` |
| TurboGovernance | `0x9e7A91D9F891373DD0846f443E4484EfA12c4899` |
| EmpowerTours Passport | `0x93126e59004692b01961be505aa04f55d5bd1851` |
| TOURS Token | `0x45b76a127167fD7FC7Ed264ad490144300eCfcBF` |

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
