export default function Logo() {
  return (
    <svg width="129" height="40" viewBox="0 0 129 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Compass/tour icon */}
      <circle cx="16" cy="20" r="12" stroke="white" strokeWidth="1.8" fill="none" />
      <path d="M16 10v3M16 27v3M6 20h3M23 20h3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 16l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M16 20l-3 5h6l-3-5z" fill="white" opacity="0.9" />
      {/* TURBO text */}
      <text x="34" y="24" fill="white" fontSize="15" fontWeight="700" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" letterSpacing="0.5">
        TURBO
      </text>
    </svg>
  );
}
