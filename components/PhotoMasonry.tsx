"use client";

import Image from "next/image";
import { Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

type Photo = {
  id: string;
  src: string;
  width: number;
  height: number;
  caption: string;
};

export function PhotoMasonry({ photos }: { photos: Photo[] }) {
  const router = useRouter();

  async function deletePhoto(photoId: string) {
    await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    router.refresh();
  }

  if (photos.length === 0) {
    return (
      <div className="panel p-8 text-sm leading-6 text-[var(--muted)]">
        还没有反馈作品。上传完成片，让小组一起回看光线、叙事和选片。
      </div>
    );
  }

  return (
    <div className="masonry">
      {photos.map((photo, index) => (
        <figure className="masonry-item panel reveal overflow-hidden" style={{ animationDelay: `${index * 45}ms` }} key={photo.id}>
          <Image
            src={photo.src}
            alt={photo.caption || "摄影作品"}
            width={photo.width}
            height={photo.height}
            className="h-auto w-full object-cover"
          />
          <figcaption className="flex items-start justify-between gap-3 p-3 text-sm text-[var(--muted)]">
            <span>{photo.caption || "未添加说明"}</span>
            <button
              className="button button-danger min-h-9 px-2"
              type="button"
              aria-label="删除照片"
              onClick={() => deletePhoto(photo.id)}
            >
              <Trash size={16} />
            </button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
