"use client";

import { Trash } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { deleteSessionAction } from "@/app/actions";
import { PendingButton } from "@/components/PendingButton";

type DeleteSessionButtonProps = {
  sessionId: string;
  sessionTitle: string;
};

export function DeleteSessionButton({ sessionId, sessionTitle }: DeleteSessionButtonProps) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function deleteSession() {
    const confirmed = window.confirm(
      `确认删除拍摄计划「${sessionTitle}」？工作流内容和已上传照片都会一起删除。`
    );
    if (!confirmed) {
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await deleteSessionAction(sessionId);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="relative">
      <PendingButton
        aria-label={`删除 ${sessionTitle}`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-300/25 bg-red-950/20 text-red-100/60 transition hover:border-red-200/45 hover:bg-red-900/35 hover:text-red-100 focus-visible:border-red-200/50 focus-visible:text-red-100"
        disabled={pending}
        onClick={deleteSession}
        pending={pending}
        pendingContent={<Trash size={12} aria-hidden="true" />}
        pendingText="删除中..."
        title="删除拍摄计划"
        type="button"
      >
        <Trash size={12} aria-hidden="true" />
      </PendingButton>
      {error ? (
        <p className="absolute right-0 top-8 z-20 w-48 rounded-[8px] border border-red-300/25 bg-red-950/95 p-2 text-xs leading-5 text-red-100" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
