export function SignBridgeLogo() {
  return (
    <span className="logo group inline-flex items-center gap-2">
      <span className="ink logo-mark flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none">
          {/* stylised hand + bridge arc */}
          <path
            d="M4 19c0-5 3.6-8 8-8s8 3 8 8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="logo-arc"
          />
          <path
            d="M8 19v-4M12 19v-6M16 19v-4"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="logo-piers"
          />
          <circle cx="12" cy="6" r="2.2" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight">
        SIGN<span className="logo-bridge inline-block">BRIDGE</span>
      </span>
    </span>
  );
}
