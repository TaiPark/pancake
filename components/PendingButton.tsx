"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ShinyText } from "@/components/react-bits/ShinyText";

type PendingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  pendingText: ReactNode;
};

export function PendingButton({ children, className = "", disabled, pending, pendingText, type = "submit", ...props }: PendingButtonProps) {
  const { pending: formPending } = useFormStatus();
  const isPending = pending ?? formPending;

  return (
    <button
      aria-busy={isPending}
      className={`${className} ${isPending ? "button-pending" : ""}`.trim()}
      disabled={disabled || isPending}
      type={type}
      {...props}
    >
      {isPending ? <ShinyText>{pendingText}</ShinyText> : children}
    </button>
  );
}
