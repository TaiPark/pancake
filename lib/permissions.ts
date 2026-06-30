import { prisma } from "@/lib/prisma";

export async function requireGroupMember(userId: string, groupId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId
      }
    }
  });

  if (!membership) {
    throw new Error("UNAUTHORIZED_GROUP_ACCESS");
  }

  return membership;
}

export async function isGroupMember(userId: string, groupId: string) {
  const count = await prisma.groupMember.count({
    where: { userId, groupId }
  });

  return count > 0;
}
