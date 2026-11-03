"use client";

import { useFormStatus } from "react-dom";

/** A form's submit button that shows "Saving…" and can't be pressed twice while the form is being saved. */
export default function SubmitButton({
  children,
  className,
  pendingText = "Saving…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? (
        <>
          <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]" aria-hidden />{" "}
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
