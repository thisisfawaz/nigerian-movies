"use client";

import { useFormStatus } from "react-dom";

import { InlineSpinner } from "@/components/loading";
import { Button } from "@/components/ui";

/**
 * Submit button that reflects the pending state of its parent <form>'s server
 * action (Next.js App Router). While the action runs it is disabled and shows
 * a spinner, so the user always knows an action is in progress.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className} aria-busy={pending}>
      {pending ? <InlineSpinner /> : null}
      {pending ? pendingLabel ?? children : children}
    </Button>
  );
}

/**
 * Icon-only submit button (e.g. table row actions) that shows a spinner and
 * disables itself while the parent form's action is pending.
 */
export function SubmitIconButton({
  children,
  pendingChildren,
  className,
  ariaLabel,
  title
}: {
  children: React.ReactNode;
  pendingChildren?: React.ReactNode;
  className?: string;
  ariaLabel: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {pending ? pendingChildren ?? <InlineSpinner /> : children}
    </button>
  );
}
