"use client";

import { Trash } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { deleteGroupAction } from "@/app/actions";
import { PendingButton } from "@/components/PendingButton";

type DeleteGroupButtonProps = {
  groupId: string;
  groupName: string;
};

export function DeleteGroupButton({ groupId, groupName }: DeleteGroupButtonProps) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function deleteGroup() {
    const confirmed = window.confirm(`确认删除小组「${groupName}」？相关 Session、作品记录、AI 配置和 Skill 都会一起删除。`);
    if (!confirmed) {
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await deleteGroupAction(groupId);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <PendingButton
        aria-label={`删除小组 ${groupName}`}
        className="button button-danger button-icon absolute right-4 top-4 z-10 opacity-70 transition hover:opacity-100 focus-visible:opacity-100"
        disabled={pending}
        onClick={deleteGroup}
        pending={pending}
        pendingContent={<Trash size={15} aria-hidden="true" />}
        pendingText="删除中..."
        title="删除小组"
        type="button"
      >
        <Trash size={15} aria-hidden="true" />
      </PendingButton>
      {error ? <p className="text-xs leading-5 text-red-200">{error}</p> : null}
    </>
  );
}
