import { SessionStage } from "@prisma/client";

export type SparkFields = {
  theme: string;
  mood: string;
  references: string;
  notes: string;
  objective: string;
  deliverables: string;
  location: string;
  callSheet: string;
  team: string;
  gear: string;
  styling: string;
  shotList: string;
  lightingPlan: string;
  onsiteChecklist: string;
  liveNotes: string;
  backupPlan: string;
  selects: string;
  retouching: string;
  publishing: string;
  retrospective: string;
};

export const defaultSparkFields: SparkFields = {
  theme: "",
  mood: "",
  objective: "",
  deliverables: "",
  location: "",
  callSheet: "",
  team: "",
  gear: "",
  styling: "",
  references: "",
  shotList: "",
  lightingPlan: "",
  notes: "",
  onsiteChecklist: "",
  liveNotes: "",
  backupPlan: "",
  selects: "",
  retouching: "",
  publishing: "",
  retrospective: ""
};

export type WorkflowField = {
  name: keyof SparkFields;
  label: string;
  placeholder: string;
  multiline?: boolean;
};

export type WorkflowSection = {
  stage: SessionStage;
  title: string;
  summary: string;
  fields: WorkflowField[];
};

export const workflowSections: WorkflowSection[] = [
  {
    stage: SessionStage.SPARK,
    title: "拍摄前",
    summary: "把想法收束成能出门执行的通告、分镜和物料清单。",
    fields: [
      { name: "theme", label: "主题", placeholder: "例如：雨后便利店人像" },
      { name: "mood", label: "情绪与质感", placeholder: "潮湿、霓虹、低饱和、胶片颗粒" },
      { name: "objective", label: "拍摄目标", placeholder: "这次最终要解决什么表达、练习或交付？", multiline: true },
      { name: "deliverables", label: "交付规格", placeholder: "例如：9 张精修、16:9 封面、竖版小红书组图" },
      { name: "location", label: "地点与许可", placeholder: "地址、集合点、备选室内点、是否需要报备" },
      { name: "callSheet", label: "通告时间", placeholder: "集合、妆造、开拍、转场、收工" },
      { name: "team", label: "成员分工", placeholder: "摄影、模特、妆造、灯光、后勤、联系人" },
      { name: "gear", label: "器材与道具", placeholder: "机身、镜头、灯、支架、电池、服装、道具", multiline: true },
      { name: "styling", label: "服化造", placeholder: "妆面、发型、服装、配色和禁忌", multiline: true },
      { name: "references", label: "参考资料", placeholder: "图片链接、电影片段、摄影师参考、姿势参考", multiline: true },
      { name: "shotList", label: "分镜清单", placeholder: "按场景写：景别、动作、构图、情绪、必拍镜头", multiline: true },
      { name: "lightingPlan", label: "灯光方案", placeholder: "自然光、补光方向、色温、反光板、夜景安全线", multiline: true },
      { name: "notes", label: "未定问题", placeholder: "还要确认的风险、限制和开放想法", multiline: true }
    ]
  },
  {
    stage: SessionStage.PLAN,
    title: "拍摄中",
    summary: "现场按检查清单推进，记录变化、补拍项和备份状态。",
    fields: [
      { name: "onsiteChecklist", label: "现场检查", placeholder: "到场确认：光线、机位、妆造、道具、安全、授权", multiline: true },
      { name: "liveNotes", label: "现场记录", placeholder: "临时改动、好用角度、情绪反馈、需要回补的镜头", multiline: true },
      { name: "backupPlan", label: "备份与收尾", placeholder: "卡1/卡2、云盘、文件命名、收工前确认项", multiline: true }
    ]
  },
  {
    stage: SessionStage.FEEDBACK,
    title: "拍摄后",
    summary: "完成选片、修图、发布和复盘，让下一次拍摄更顺。",
    fields: [
      { name: "selects", label: "选片记录", placeholder: "入选、待定、废片原因、需要二次讨论的照片", multiline: true },
      { name: "retouching", label: "修图要求", placeholder: "肤色、色调、裁切、交付尺寸、禁修点", multiline: true },
      { name: "publishing", label: "发布计划", placeholder: "平台、文案、署名、发布时间、授权范围", multiline: true },
      { name: "retrospective", label: "复盘", placeholder: "现场哪里顺、哪里卡、下次要提前准备什么", multiline: true }
    ]
  }
];

export function parseSparkFields(value: unknown): SparkFields {
  if (!value || typeof value !== "object") {
    return defaultSparkFields;
  }

  const record = value as Partial<Record<keyof SparkFields, unknown>>;

  return Object.fromEntries(
    Object.keys(defaultSparkFields).map((key) => {
      const value = record[key as keyof SparkFields];
      return [key, typeof value === "string" ? value : ""];
    })
  ) as SparkFields;
}

export function mergeSparkFields(current: SparkFields, formData: FormData): SparkFields {
  return Object.fromEntries(
    Object.keys(defaultSparkFields).map((key) => {
      if (formData.has(key)) {
        return [key, String(formData.get(key) ?? "")];
      }
      return [key, current[key as keyof SparkFields]];
    })
  ) as SparkFields;
}

export function canMoveSessionStage(from: SessionStage, to: SessionStage): boolean {
  if (from === to) return true;

  const order = [SessionStage.SPARK, SessionStage.PLAN, SessionStage.FEEDBACK];
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);

  return fromIndex !== -1 && toIndex !== -1 && Math.abs(fromIndex - toIndex) === 1;
}

export function stageLabel(stage: SessionStage): string {
  const labels: Record<SessionStage, string> = {
    SPARK: "拍摄前",
    PLAN: "拍摄中",
    FEEDBACK: "拍摄后"
  };

  return labels[stage];
}

export function stageHint(stage: SessionStage): string {
  const hints: Record<SessionStage, string> = {
    SPARK: "主题、通告、分镜、服化造、器材和风险预案。",
    PLAN: "现场检查、临时调整、补拍提醒和素材备份。",
    FEEDBACK: "选片、修图、发布、授权和下一次复盘。"
  };

  return hints[stage];
}

export const defaultPlanMarkdown = `## 拍摄前

### 目标
- 这次拍摄要表达：
- 最终交付：

### 通告
- 集合时间：
- 地点/备选地点：
- 成员分工：

### 分镜与物料
- 必拍镜头：
- 灯光/器材：
- 服化造/道具：

## 拍摄中

### 现场检查
- 光线：
- 构图：
- 安全与授权：

### 临时记录
- 现场改动：
- 需要补拍：
- 素材备份：

## 拍摄后

### 选片与修图
- 入选标准：
- 修图要求：

### 发布与复盘
- 发布平台：
- 署名/授权：
- 下次优化：`;
