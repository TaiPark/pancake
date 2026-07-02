"use client";

import Image from "next/image";
import { Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

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
        <motion.figure
          className="masonry-item panel reveal overflow-hidden"
          style={{ animationDelay: `${index * 45}ms` }}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.42, delay: index * 0.035, ease: [0.16, 1, 0.3, 1] }}
          key={photo.id}
        >
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
        </motion.figure>
      ))}
    </div>
  );
}
