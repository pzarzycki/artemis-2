export default function ArtemisLogo({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="al-spaceBg" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#0d2045"/>
          <stop offset="100%" stopColor="#040b1a"/>
        </radialGradient>
        <radialGradient id="al-moonGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#d4d8e0"/>
          <stop offset="60%" stopColor="#9ea8b5"/>
          <stop offset="100%" stopColor="#6b7480"/>
        </radialGradient>
        <radialGradient id="al-earthGrad" cx="40%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#5bb3f0"/>
          <stop offset="50%" stopColor="#1a6fba"/>
          <stop offset="100%" stopColor="#0d3d6e"/>
        </radialGradient>
        <linearGradient id="al-ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a92a"/>
          <stop offset="50%" stopColor="#f0cb50"/>
          <stop offset="100%" stopColor="#a87c1a"/>
        </linearGradient>
        <clipPath id="al-circleClip">
          <circle cx="32" cy="32" r="28"/>
        </clipPath>
      </defs>

      {/* Outer gold ring */}
      <circle cx="32" cy="32" r="31" fill="url(#al-ringGrad)"/>
      <circle cx="32" cy="32" r="29" fill="#040b1a"/>

      <g clipPath="url(#al-circleClip)">
        {/* Space background */}
        <circle cx="32" cy="32" r="28" fill="url(#al-spaceBg)"/>

        {/* Stars */}
        <circle cx="12" cy="10" r="0.6" fill="white" opacity="0.9"/>
        <circle cx="22" cy="7"  r="0.5" fill="white" opacity="0.8"/>
        <circle cx="38" cy="9"  r="0.7" fill="white" opacity="0.9"/>
        <circle cx="50" cy="13" r="0.5" fill="white" opacity="0.7"/>
        <circle cx="8"  cy="20" r="0.5" fill="white" opacity="0.8"/>
        <circle cx="54" cy="22" r="0.6" fill="white" opacity="0.8"/>
        <circle cx="55" cy="32" r="0.5" fill="white" opacity="0.7"/>
        <circle cx="45" cy="18" r="0.5" fill="white" opacity="0.7"/>
        <circle cx="28" cy="14" r="0.4" fill="white" opacity="0.6"/>

        {/* Moon surface */}
        <circle cx="32" cy="58" r="26" fill="url(#al-moonGrad)"/>

        {/* Moon craters */}
        <circle cx="22" cy="50" r="2.5" fill="none" stroke="#8a939f" strokeWidth="0.7" opacity="0.6"/>
        <circle cx="40" cy="54" r="1.8" fill="none" stroke="#8a939f" strokeWidth="0.6" opacity="0.5"/>
        <circle cx="30" cy="56" r="1.2" fill="none" stroke="#8a939f" strokeWidth="0.5" opacity="0.5"/>

        {/* Earthrise */}
        <circle cx="18" cy="34" r="7.5" fill="url(#al-earthGrad)"/>
        <ellipse cx="16" cy="31" rx="2.8" ry="2" fill="#2e8b3f" opacity="0.85" transform="rotate(-20 16 31)"/>
        <ellipse cx="21" cy="35" rx="2" ry="1.5" fill="#2e8b3f" opacity="0.75" transform="rotate(10 21 35)"/>
        <ellipse cx="15" cy="37" rx="1.5" ry="1" fill="#2e8b3f" opacity="0.65"/>
        <ellipse cx="18" cy="29" rx="3.5" ry="1.2" fill="white" opacity="0.5" transform="rotate(-15 18 29)"/>
        <ellipse cx="13" cy="34" rx="2" ry="0.8" fill="white" opacity="0.4"/>
        <ellipse cx="20" cy="39" rx="2.8" ry="1" fill="white" opacity="0.45" transform="rotate(10 20 39)"/>

        {/* Red trajectory arc */}
        <path d="M 8 44 Q 20 16 56 20" fill="none" stroke="#d42b2b" strokeWidth="2.8" strokeLinecap="round"/>
        <polygon points="56,20 50,17 52,23" fill="#d42b2b"/>
      </g>

      {/* Inner ring border */}
      <circle cx="32" cy="32" r="28" fill="none" stroke="#c9a227" strokeWidth="0.8"/>
    </svg>
  );
}
