export default function LogoIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Cyan Shield */}
      <path
        d="M7 2.5 L17 2.5 Q20.5 2.5 20.5 6 L20.5 12.5 Q20.5 18.5 12 21.5 Q3.5 18.5 3.5 12.5 L3.5 6 Q3.5 2.5 7 2.5 Z"
        fill="#00A8E8"
      />
      {/* Crisp White Checkmark */}
      <path
        d="M8.5 12.2L11 14.8L15.8 9.2"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
