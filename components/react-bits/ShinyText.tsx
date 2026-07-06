import type { ReactNode } from "react";

type ShinyTextProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function ShinyText({ children, className = "", disabled = false }: ShinyTextProps) {
  return <span className={`shiny-text ${disabled ? "shiny-text-disabled" : ""} ${className}`.trim()}>{children}</span>;
}
