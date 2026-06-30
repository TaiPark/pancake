import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireGroupMember } from "@/lib/permissions";
import { deletePhotoObject } from "@/lib/storage";

export async function DELETE(_request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { photoId } = await params;
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: {
      session: {
        select: { groupId: true }
      }
    }
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await requireGroupMember(session.user.id, photo.session.groupId);
  await deletePhotoObject(photo.objectKey);
  await prisma.photo.delete({ where: { id: photo.id } });

  return NextResponse.json({ ok: true });
}
