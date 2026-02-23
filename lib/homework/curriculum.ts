export const PHASE_COLORS = {
  foundations: '#06b6d4',
  web3: '#8b5cf6',
  fullstack: '#f59e0b',
  business: '#22c55e',
} as const;

export interface WeekEntry {
  week: number;
  title: string;
  phase: string;
  phaseColor: string;
  deliverable: string;
  description: string;
}

export const MILESTONES = [8, 20, 36, 52] as const;

export const CURRICULUM: WeekEntry[] = [
  // Phase 1: Dev Foundations (Weeks 1–8)
  { week: 1, title: 'GitHub Account & Profile Setup', phase: 'Dev Foundations', phaseColor: PHASE_COLORS.foundations, deliverable: 'week-01/profile.md', description: 'Create your GitHub profile with bio, photo, and pinned repos.' },
  { week: 2, title: 'WSL & Terminal Basics', phase: 'Dev Foundations', phaseColor: PHASE_COLORS.foundations, deliverable: 'week-02/commands.md', description: 'Learn essential terminal commands and document your terminal session.' },
  { week: 3, title: 'Git Fundamentals', phase: 'Dev Foundations', phaseColor: PHASE_COLORS.foundations, deliverable: 'week-03/first-repo.md', description: 'Create a repo with at least 3 meaningful commits.' },
  { week: 4, title: 'Secrets, .gitignore & Privacy', phase: 'Dev Foundations', phaseColor: PHASE_COLORS.foundations, deliverable: 'week-04/security-checklist.md', description: 'Learn .gitignore patterns, .env.example workflow, and what happens when secrets leak.' },
  { week: 5, title: 'Branching, Merging & PRs', phase: 'Dev Foundations', phaseColor: PHASE_COLORS.foundations, deliverable: 'week-05/pr-review.md', description: 'Create branches, open PRs, and review code.' },
  { week: 6, title: 'Pre-commits & Secrets Scanning', phase: 'Dev Foundations', phaseColor: PHASE_COLORS.foundations, deliverable: 'week-06/.pre-commit-config.yaml', description: 'Set up pre-commit hooks with detect-secrets and lint hooks.' },
  { week: 7, title: 'CI/CD & GitHub Actions', phase: 'Dev Foundations', phaseColor: PHASE_COLORS.foundations, deliverable: 'week-07/.github/workflows/ci.yml', description: 'Create a GitHub Actions workflow for automated testing.' },
  { week: 8, title: 'HTML/CSS/JS Basics', phase: 'Dev Foundations', phaseColor: PHASE_COLORS.foundations, deliverable: 'week-08/index.html', description: 'Build a valid HTML page with CSS styling and JavaScript.' },

  // Phase 2: Web3 & Blockchain (Weeks 9–20)
  { week: 9, title: 'What is Blockchain?', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-09/blockchain-essay.md', description: 'Write a 300+ word essay explaining blockchain technology.' },
  { week: 10, title: 'Wallet Security & Key Management', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-10/key-safety.md', description: 'Document private key storage, hardware wallets, and dev key management.' },
  { week: 11, title: 'Wallets & Transactions on Monad', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-11/wallet-setup.md', description: 'Set up a wallet and submit a transaction on Monad.' },
  { week: 12, title: 'Foundry Setup & Solidity Basics', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-12/src/Storage.sol', description: 'Install Foundry, create a project, write a Storage contract with events and modifiers.' },
  { week: 13, title: 'ERC-20 Token with Foundry', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-13/src/MyToken.sol', description: 'Write an ERC-20 token contract with Foundry tests.' },
  { week: 14, title: 'Deploying on Monad', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-14/deployment.md', description: 'Deploy to Monad testnet and mainnet, verify on MonadScan.' },
  { week: 15, title: 'Reading Contracts with viem', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-15/read-contract.ts', description: 'Read data from your deployed contract using viem.' },
  { week: 16, title: 'Writing Transactions with viem', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-16/send-tx.ts', description: 'Send transactions to your deployed contract using viem.' },
  { week: 17, title: 'NFT Fundamentals (ERC-721)', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-17/src/MyNFT.sol', description: 'Write an ERC-721 NFT contract with Foundry tests.' },
  { week: 18, title: 'On-chain SVG NFTs', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-18/src/OnChainNFT.sol', description: 'Create an on-chain SVG NFT deployed and verified on Monad.' },
  { week: 19, title: 'DeFi Concepts', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-19/defi-summary.md', description: 'Write a 400+ word summary of DeFi concepts.' },
  { week: 20, title: 'Smart Contract Security & Auditing', phase: 'Web3 & Blockchain', phaseColor: PHASE_COLORS.web3, deliverable: 'week-20/AuditReport.md', description: 'Perform a security audit on a sample contract.' },

  // Phase 3: Full-Stack Development (Weeks 21–36)
  { week: 21, title: 'React Fundamentals', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-21/src/App.tsx', description: 'Build a React application with components and state.' },
  { week: 22, title: 'Next.js Getting Started', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-22/app/page.tsx', description: 'Create a Next.js app with App Router.' },
  { week: 23, title: 'Tailwind CSS & Responsive Design', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-23/app/globals.css', description: 'Style a responsive page with Tailwind CSS.' },
  { week: 24, title: 'API Routes & Server Actions', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-24/app/api/data/route.ts', description: 'Create Next.js API routes and server actions.' },
  { week: 25, title: 'Database Basics (Redis)', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-25/app/api/redis-demo/route.ts', description: 'Build an API that reads/writes to Redis.' },
  { week: 26, title: 'Authentication with Privy', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-26/components/providers.tsx', description: 'Implement wallet auth with Privy.' },
  { week: 27, title: 'Frontend ↔ Smart Contracts', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-27/app/page.tsx', description: 'Connect a frontend to your smart contracts with viem.' },
  { week: 28, title: 'Full-Stack dApp: Token Dashboard', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-28/README.md', description: 'Build a complete token dashboard dApp with screenshots.' },
  { week: 29, title: 'Testing Basics', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-29/tests/index.test.ts', description: 'Write and run passing tests for your code.' },
  { week: 30, title: 'Deployment (Railway/Vercel)', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-30/deployment.md', description: 'Deploy your app and share the live URL.' },
  { week: 31, title: 'TypeScript Deep Dive', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-31/src/types.ts', description: 'Create advanced TypeScript types and interfaces.' },
  { week: 32, title: 'Form Handling & Validation', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-32/app/form/page.tsx', description: 'Build forms with client and server validation.' },
  { week: 33, title: 'File Uploads & IPFS', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-33/app/api/upload/route.ts', description: 'Handle file uploads and pin to IPFS.' },
  { week: 34, title: 'Webhooks & Event Processing', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-34/app/api/webhook/route.ts', description: 'Build a webhook handler that processes events.' },
  { week: 35, title: 'Performance & Optimization', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-35/app/loading.tsx', description: 'Add loading states, error boundaries, and optimize performance.' },
  { week: 36, title: 'Capstone: Mini dApp', phase: 'Full-Stack Dev', phaseColor: PHASE_COLORS.fullstack, deliverable: 'week-36/README.md', description: 'Build and deploy a complete mini dApp with live URL.' },

  // Phase 4: Business & Startup (Weeks 37–52)
  { week: 37, title: 'Problem Discovery & Validation', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-37/problem-validation.md', description: 'Identify and validate a real problem worth solving.' },
  { week: 38, title: 'Business Model Canvas', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-38/business-model-canvas.md', description: 'Create a complete business model canvas.' },
  { week: 39, title: 'Competitive Analysis', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-39/competitive-analysis.md', description: 'Analyze competitors and identify your advantage.' },
  { week: 40, title: 'User Personas & Journey Maps', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-40/user-personas.md', description: 'Create detailed user personas and journey maps.' },
  { week: 41, title: 'MVP Definition & Roadmap', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-41/mvp-roadmap.md', description: 'Define your MVP scope and development roadmap.' },
  { week: 42, title: 'Tokenomics Design', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-42/tokenomics.md', description: 'Design your token economics and distribution model.' },
  { week: 43, title: 'Marketing Strategy for Web3', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-43/marketing-plan.md', description: 'Create a Web3 marketing strategy and go-to-market plan.' },
  { week: 44, title: 'Community Building', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-44/community-report.md', description: 'Build and document your community growth strategy.' },
  { week: 45, title: 'Financial Projections', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-45/financial-model.md', description: 'Create 3-year financial projections.' },
  { week: 46, title: 'Pitch Deck Draft', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-46/pitch-deck.md', description: 'Draft your investor pitch deck.' },
  { week: 47, title: 'Legal & Compliance Basics', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-47/legal-overview.md', description: 'Research legal and compliance requirements.' },
  { week: 48, title: 'Fundraising Strategy', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-48/fundraising-plan.md', description: 'Create your fundraising strategy and investor pipeline.' },
  { week: 49, title: 'Demo Day Rehearsal', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-49/demo-video-link.md', description: 'Record a practice demo and get feedback.' },
  { week: 50, title: 'NITRO Application Prep', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-50/nitro-application-draft.md', description: 'Draft your NITRO application with all required materials.' },
  { week: 51, title: 'LATAM Market Deep Dive', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-51/latam-market-analysis.md', description: 'Research and analyze your target LATAM market.' },
  { week: 52, title: 'Final Presentation & Graduation', phase: 'Business & Startup', phaseColor: PHASE_COLORS.business, deliverable: 'week-52/graduation.md', description: 'Deliver your final presentation and graduate from TURBO.' },
];
