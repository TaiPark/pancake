"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadSimple } from "@phosphor-icons/react";
import { createPhotoUploadAction, registerPhotoAction } from "@/app/actions";

export function PhotoUploader({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("请选择一张照片。");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("fileName", file.name);
        formData.set("contentType", file.type || "application/octet-stream");
        formData.set("caption", caption);
        formData.set("width", "1200");
        formData.set("height", "1600");

        const { uploadUrl, objectKey } = await createPhotoUploadAction(sessionId, formData);
        const response = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream"
          }
        });

        if (!response.ok) {
          throw new Error("UPLOAD_FAILED");
        }

        formData.set("objectKey", objectKey);
        await registerPhotoAction(sessionId, formData);
        setCaption("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } catch {
        setError("上传失败，请确认 MinIO 已启动并重试。");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="panel grid gap-3 p-4">
      <label className="grid gap-2 text-sm">
        上传作品
        <input ref={fileRef} className="field" type="file" accept="image/*" />
      </label>
      <label className="grid gap-2 text-sm">
        照片说明
        <input
          className="field"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="例如：第二张保留了雨痕的反光"
        />
      </label>
      {error ? <p className="text-sm text-red-200">{error}</p> : null}
      <button className="button button-primary" type="submit" disabled={isPending}>
        <UploadSimple size={18} weight="bold" />
        {isPending ? "上传中" : "上传照片"}
      </button>
    </form>
  );
}
