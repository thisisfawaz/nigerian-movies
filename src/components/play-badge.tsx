/** Yellow circular play badge with a soft, rounded (curvy) play icon. */
export function PlayBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none flex aspect-square h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pop text-pop-foreground shadow-lg ${className}`}
      aria-hidden="true"
    >
      {/* Rounded triangle centered in its own viewBox so flex centering works. */}
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
        <path d="M9.9 6.2c-.9-.6-2.1.1-2.1 1.2v9.2c0 1.1 1.2 1.8 2.1 1.2l7.2-4.6c.8-.5.8-1.7 0-2.2z" />
      </svg>
    </span>
  );
}
