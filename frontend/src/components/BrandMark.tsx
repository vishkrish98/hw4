interface BrandMarkProps {
  size?: number;
  className?: string;
}

/**
 * Campus Customs' own mark -- a bulldog silhouette in a shield, not a generic wordmark.
 * Used in the nav, the chat avatar, and anywhere else the brand needs an icon rather than text.
 */
export default function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 2 L44 9 V22 C44 34 36 43 24 46 C12 43 4 34 4 22 V9 Z"
        fill="var(--yale-blue-dark, #00203f)"
      />
      <path
        d="M24 2 L44 9 V22 C44 34 36 43 24 46"
        stroke="var(--yale-accent, #e0b13d)"
        strokeWidth="1.5"
        fill="none"
      />
      <g fill="#fff">
        <ellipse cx="16.5" cy="20" rx="4.2" ry="5.4" transform="rotate(-18 16.5 20)" />
        <ellipse cx="31.5" cy="20" rx="4.2" ry="5.4" transform="rotate(18 31.5 20)" />
        <ellipse cx="24" cy="26" rx="10.5" ry="9" />
      </g>
      <g fill="var(--yale-blue-dark, #00203f)">
        <circle cx="19.4" cy="24.2" r="1.7" />
        <circle cx="28.6" cy="24.2" r="1.7" />
        <path d="M21.6 29.5 Q24 32.2 26.4 29.5 Q24 31 21.6 29.5 Z" />
        <ellipse cx="24" cy="27.6" rx="2" ry="1.5" />
      </g>
    </svg>
  );
}
