"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";

export function InviteCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button className="button button-secondary min-h-11 px-3 text-sm" onClick={copyCode} type="button">
      {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
      {copied ? "已复制" : `复制邀请码 ${code}`}
    </button>
  );
}
