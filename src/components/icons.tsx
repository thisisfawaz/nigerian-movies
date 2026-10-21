import type { SVGProps } from "react";

/** Inline, non-animated SVG icons. Stroke uses currentColor. */

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </Base>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Base>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </Base>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01Z" />
    </Base>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 4l14 8-14 8Z" />
    </Base>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx={11} cy={11} r={7} />
      <path d="M21 21l-4.3-4.3" />
    </Base>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Base>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 18l-6-6 6-6" />
    </Base>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 18l6-6-6-6" />
    </Base>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Base>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Base>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x={3} y={3} width={7} height={7} rx={1} />
      <rect x={14} y={3} width={7} height={7} rx={1} />
      <rect x={3} y={14} width={7} height={7} rx={1} />
      <rect x={14} y={14} width={7} height={7} rx={1} />
    </Base>
  );
}

export function FilmIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x={3} y={3} width={18} height={18} rx={2} />
      <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" />
    </Base>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </Base>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x={3} y={4} width={18} height={18} rx={2} />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Base>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx={12} cy={8} r={4} />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Base>
  );
}
