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
    <div className="grid gap-2">
      <PendingButton
        aria-label={`删除小组 ${groupName}`}
        className="button button-danger min-h-9 px-3 text-xs"
        disabled={pending}
        onClick={deleteGroup}
        pending={pending}
        pendingText="删除中..."
        type="button"
      >
        <Trash size={14} />
        删除小组
      </PendingButton>
      {error ? <p className="text-xs leading-5 text-red-200">{error}</p> : null}
    </div>
  );
}
