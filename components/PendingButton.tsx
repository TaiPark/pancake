"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ShinyText } from "@/components/react-bits/ShinyText";

type PendingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingContent?: ReactNode;
  pending?: boolean;
  pendingText: ReactNode;
};

export function PendingButton({
  children,
  className = "",
  disabled,
  pending,
  pendingContent,
  pendingText,
  type = "submit",
  ...props
}: PendingButtonProps) {
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
      {isPending ? pendingContent ?? <ShinyText>{pendingText}</ShinyText> : children}
    </button>
  );
}
