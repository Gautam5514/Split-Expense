// Navigation needle + open orbital paths: a compact, code-drawn Autopilot mark.
export default function AutopilotMark({ size = 24, className = "", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...props}
    >
      <path
        d="M4.5 16.7A10 10 0 0 1 17.3 4.5M23.5 11.3A10 10 0 0 1 10.7 23.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        opacity=".65"
      />
      <path
        d="m14 6.7 5.1 13-5.1-3-5.1 3 5.1-13Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth=".7"
        strokeLinejoin="round"
      />
      <circle cx="21.5" cy="5.7" r="2" fill="#99F6E4" />
      <circle cx="6.5" cy="22.3" r="1.25" fill="currentColor" opacity=".85" />
    </svg>
  );
}
