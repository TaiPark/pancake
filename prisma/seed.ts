import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { defaultSparkFields } from "../lib/domain";

async function main() {
  const passwordHash = await bcrypt.hash("pancake-demo", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@pancake.local" },
    update: {},
    create: {
      name: "栗子",
      email: "demo@pancake.local",
      passwordHash
    }
  });

  const group = await prisma.group.upsert({
    where: { slug: "demo-darkroom" },
    update: {},
    create: {
      name: "夜色暗房",
      slug: "demo-darkroom",
      inviteCode: "PANCAKE1",
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER"
        }
      }
    }
  });

  await prisma.session.upsert({
    where: { id: "demo-session-rain-night" },
    update: {},
    create: {
      id: "demo-session-rain-night",
      groupId: group.id,
      title: "雨后便利店人像",
      stage: "SPARK",
      sparkFields: {
        ...defaultSparkFields,
        theme: "夜雨后的便利店门口",
        mood: "潮湿、低饱和、霓虹反光、轻微胶片颗粒",
        references: "王家卫式近景，但构图更安静。",
        notes: "模特不看镜头，手里拿热咖啡。地面积水要成为第二个画面。"
      },
      planMarkdown: "## 拍摄目标\n\n保留夜色中的湿润空气，让人物像刚从一段故事里走出来。\n\n## 现场顺序\n\n1. 先拍便利店外景\n2. 再拍玻璃反射\n3. 最后拍近景情绪",
      updatedById: user.id
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
