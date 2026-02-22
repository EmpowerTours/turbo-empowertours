import { getCountryByCode, getFlagEmoji } from './countries';

export interface PassportStamp {
  locationName: string;
  city: string;
  country: string;
  stampedAt: number;
  stampImageIPFS?: string;
  experienceType?: string;
}

// Generate SVG passport image with country info and optional stamps
export function generatePassportSVG(
  countryCode: string,
  countryName: string,
  tokenId: number,
  stamps: PassportStamp[] = []
): string {
  const flag = getFlagEmoji(countryCode);
  const country = getCountryByCode(countryCode);
  const region = country?.region || 'Unknown Region';
  const continent = country?.continent || 'Unknown';

  const svg = `<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#bgGradient)"/>
  <rect x="10" y="10" width="380" height="580" fill="none" stroke="#60a5fa" stroke-width="4" rx="10"/>
  <rect x="20" y="20" width="360" height="100" fill="#3b82f6" rx="8" opacity="0.8"/>
  <text x="200" y="60" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">
    EMPOWER TOURS
  </text>
  <text x="200" y="95" font-family="Arial, sans-serif" font-size="18" fill="#e0f2fe" text-anchor="middle">
    Digital Passport
  </text>
  <rect x="20" y="140" width="360" height="280" fill="#1e40af" rx="8" opacity="0.3"/>
  <text x="200" y="240" font-size="120" text-anchor="middle">
    ${flag}
  </text>
  <text x="200" y="330" font-family="Arial, sans-serif" font-size="${countryName.length > 15 ? '28' : '32'}" font-weight="bold" fill="white" text-anchor="middle">
    ${countryName.toUpperCase()}
  </text>
  <text x="200" y="365" font-family="Arial, sans-serif" font-size="18" fill="#93c5fd" text-anchor="middle">
    ${countryCode}
  </text>
  <text x="200" y="390" font-family="Arial, sans-serif" font-size="12" fill="#60a5fa" text-anchor="middle">
    ${region}
  </text>
  <circle cx="320" cy="180" r="40" fill="none" stroke="#ef4444" stroke-width="4" opacity="0.8"/>
  <text x="320" y="175" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#ef4444" text-anchor="middle">
    PASSPORT
  </text>
  <text x="320" y="195" font-family="Arial, sans-serif" font-size="12" fill="#ef4444" text-anchor="middle">
    #${tokenId}
  </text>
  <line x1="40" y1="425" x2="360" y2="425" stroke="#3b82f6" stroke-width="2" opacity="0.5"/>
  ${generateStampsSection(stamps)}
  <rect x="20" y="565" width="360" height="25" fill="#1e40af" rx="4" opacity="0.5"/>
  <text x="110" y="582" font-family="Arial, sans-serif" font-size="9" fill="#93c5fd" text-anchor="middle">
    #${tokenId} • ${continent}
  </text>
  <text x="290" y="582" font-family="Arial, sans-serif" font-size="9" fill="#60a5fa" text-anchor="middle">
    Monad
  </text>
</svg>`;

  return svg.trim();
}

function generateStampsSection(stamps: PassportStamp[]): string {
  if (stamps.length === 0) {
    return `
    <g transform="translate(30, 455)">
      <rect width="340" height="110" fill="#1e3a5f" rx="8" opacity="0.5"/>
      <text x="170" y="40" font-family="Arial, sans-serif" font-size="14" fill="#60a5fa" text-anchor="middle">
        No stamps yet
      </text>
      <text x="170" y="60" font-family="Arial, sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">
        Purchase experiences &amp; check-in to earn stamps
      </text>
      <text x="170" y="80" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" opacity="0.3">
        ✈️
      </text>
    </g>`;
  }

  const maxStampsDisplay = 6;
  const stampsToShow = stamps.slice(0, maxStampsDisplay);
  const stampColors = [
    { bg: '#10b981', text: '#6ee7b7' },
    { bg: '#ef4444', text: '#fca5a5' },
    { bg: '#8b5cf6', text: '#c4b5fd' },
    { bg: '#f59e0b', text: '#fcd34d' },
    { bg: '#06b6d4', text: '#67e8f9' },
    { bg: '#ec4899', text: '#f9a8d4' },
  ];

  let stampsHTML = `
    <g transform="translate(30, 445)">
      <text x="0" y="10" font-family="Arial, sans-serif" font-size="10" fill="#60a5fa" font-weight="bold">
        STAMPS (${stamps.length})
      </text>
    </g>`;

  stampsToShow.forEach((stamp, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 45 + col * 110;
    const y = 465 + row * 55;
    const color = stampColors[index % stampColors.length];
    const rotation = (index * 7 - 10) % 15;

    const date = new Date(stamp.stampedAt * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const cityTruncated = stamp.city.length > 10 ? stamp.city.substring(0, 9) + '.' : stamp.city;
    const locationTruncated = stamp.locationName.length > 12 ? stamp.locationName.substring(0, 11) + '.' : stamp.locationName;

    let flagOrIcon = '';
    try {
      const countryCodeGuess = stamp.country.substring(0, 2).toUpperCase();
      const maybeFlag = getFlagEmoji(countryCodeGuess);
      if (maybeFlag && maybeFlag !== countryCodeGuess) {
        flagOrIcon = maybeFlag;
      }
    } catch { /* ignore */ }

    stampsHTML += `
    <g transform="translate(${x}, ${y}) rotate(${rotation}, 45, 25)">
      <circle cx="45" cy="25" r="24" fill="${color.bg}" opacity="0.15"/>
      <circle cx="45" cy="25" r="24" fill="none" stroke="${color.bg}" stroke-width="2" stroke-dasharray="3,2"/>
      <circle cx="45" cy="25" r="18" fill="none" stroke="${color.bg}" stroke-width="1" opacity="0.5"/>
      <text x="45" y="20" font-size="14" text-anchor="middle">${flagOrIcon}</text>
      <text x="45" y="35" font-family="Arial, sans-serif" font-size="6" font-weight="bold" fill="${color.bg}" text-anchor="middle">
        ${locationTruncated.toUpperCase()}
      </text>
      <text x="45" y="43" font-family="Arial, sans-serif" font-size="5" fill="${color.text}" text-anchor="middle">
        ${cityTruncated}
      </text>
      <text x="45" y="50" font-family="Arial, sans-serif" font-size="5" fill="${color.bg}" text-anchor="middle" opacity="0.7">
        ${date}
      </text>
    </g>`;
  });

  if (stamps.length > maxStampsDisplay) {
    stampsHTML += `
    <g transform="translate(330, 555)">
      <rect x="-30" y="-12" width="60" height="18" fill="#3b82f6" rx="4" opacity="0.8"/>
      <text x="0" y="2" font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle" font-weight="bold">
        +${stamps.length - maxStampsDisplay} more
      </text>
    </g>`;
  }

  return stampsHTML;
}

// Convert SVG to base64 data URI
export function svgToDataURI(svg: string): string {
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Generate complete NFT metadata with image
export function generatePassportMetadata(
  countryCode: string,
  countryName: string,
  tokenId: number,
  stamps: PassportStamp[] = []
): object {
  const svg = generatePassportSVG(countryCode, countryName, tokenId, stamps);
  const imageDataURI = svgToDataURI(svg);
  const country = getCountryByCode(countryCode);

  return {
    name: `EmpowerTours Passport - ${countryName}`,
    description: `Digital passport NFT for ${countryName}. Collect venue stamps as you explore events and climbing locations. Unlock exclusive benefits. Part of a collection representing all 195 countries on Monad.`,
    image: imageDataURI,
    external_url: `https://turbo-empowertours-production.up.railway.app/passport`,
    attributes: [
      { trait_type: 'Country', value: countryName },
      { trait_type: 'Country Code', value: countryCode },
      { trait_type: 'Continent', value: country?.continent || 'Unknown' },
      { trait_type: 'Region', value: country?.region || 'Unknown' },
      { trait_type: 'Type', value: 'Passport NFT' },
      { trait_type: 'Features', value: 'Venue Stamps, Climbing Badges' },
      { trait_type: 'Token ID', value: tokenId.toString() },
      { trait_type: 'Mint Date', value: new Date().toISOString().split('T')[0] },
      { trait_type: 'Network', value: 'Monad' },
      { trait_type: 'Collection', value: '195 Countries' },
    ],
  };
}

// Validate country code
export function isValidCountryCode(code: string): boolean {
  return getCountryByCode(code) !== undefined;
}
