import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { defaultPlanMarkdown, defaultSparkFields } from "../lib/domain";

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

  const demoSparkFields = {
    ...defaultSparkFields,
    theme: "夜雨后的便利店门口",
    mood: "潮湿、低饱和、霓虹反光、轻微胶片颗粒",
    objective: "拍一组带叙事感的夜景人像，用便利店光源和地面积水制造城市孤独感。",
    deliverables: "9 张精修，1 张横版封面，3 张竖版社媒图。",
    location: "便利店门口与旁边玻璃橱窗；雨停后 30 分钟内优先拍反光。",
    callSheet: "19:30 集合，20:00 开拍，21:00 玻璃反射，21:40 近景情绪，22:00 收工。",
    team: "摄影：栗子；模特：阿青；灯光/反光板：小周。",
    gear: "35mm、85mm、LED 小棒灯、黑伞、毛巾、备用电池、透明雨伞。",
    styling: "深色外套，内搭低饱和灰蓝；妆面保持湿润高光，避免亮片。",
    references: "王家卫式近景，但构图更安静。参考玻璃反射、雨痕和便利店冷暖混光。",
    shotList: "1. 便利店外全身环境；2. 橱窗半身反射；3. 手持热咖啡近景；4. 低机位水面倒影；5. 模特不看镜头的侧脸。",
    lightingPlan: "优先用便利店门头光；棒灯只做眼神补光，色温偏冷，避免把雨夜打平。",
    notes: "模特不看镜头，手里拿热咖啡。地面积水要成为第二个画面。",
    onsiteChecklist: "检查地面安全、便利店客流、玻璃反光角度、衣服湿度和补妆。",
    liveNotes: "如果路人太多，先拍手部和近景，等空档再补全身。",
    backupPlan: "双卡记录，收工前现场复制到移动硬盘，文件夹命名 rain-night-YYYYMMDD。",
    selects: "优先选眼神自然、雨痕明显、反光干净的照片。",
    retouching: "保留皮肤质感，压低绿色杂光，雨滴和反光不修掉。",
    publishing: "先发 9 宫格，署名摄影/模特/妆造；便利店品牌不作为商业露出。",
    retrospective: "复盘便利店客流、雨后时间窗口、补光是否过强。"
  };
  const demoPlanMarkdown = `${defaultPlanMarkdown}

## Demo 重点

- 先拿到环境和反光，再推进情绪近景。
- 收工前必须完成双卡和移动硬盘备份。`;

  await prisma.session.upsert({
    where: { id: "demo-session-rain-night" },
    update: {
      sparkFields: demoSparkFields,
      planMarkdown: demoPlanMarkdown
    },
    create: {
      id: "demo-session-rain-night",
      groupId: group.id,
      title: "雨后便利店人像",
      stage: "SPARK",
      sparkFields: demoSparkFields,
      planMarkdown: demoPlanMarkdown,
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
