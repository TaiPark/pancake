# PancakeHub

PancakeHub 是一个摄影群组协作工作台。用户可以创建或加入群组，在群组中创建 Session，并按「拍摄前」「拍摄中」「拍摄后」推进一次拍摄。

## 功能

- 邮箱密码注册与登录，注册需要邀请码 `BILIGO`
- 群组创建、邀请码加入
- Session 看板，按拍摄前、中、后三个阶段分列
- 结构化拍摄流程字段：通告、分工、地点、器材、服化造、分镜、灯光、现场检查、备份、选片、修图、发布和复盘
- Markdown 执行文档编辑与安全预览
- 作品照片上传到 S3 兼容存储，反馈区瀑布流展示
- 动态网格背景、流光面板、入场动画和交互反馈
- Docker Compose 本地部署，包含 PostgreSQL 和 MinIO

## 本地开发

```bash
cp .env.example .env
docker compose up -d postgres minio
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

打开 `http://localhost:3000`。

演示账号：

- 邮箱：`demo@pancake.local`
- 密码：`pancake-demo`

注册新账号时使用邀请码：`BILIGO`

MinIO 控制台在 `http://localhost:9001`，账号 `pancake`，密码 `pancake-secret`。应用首次上传照片时会自动创建 `pancake-photos` bucket 并设置公开读取策略。

## Docker 部署

```bash
cp .env.example .env
docker compose up --build
```

生产环境请更换：

- `AUTH_SECRET`
- PostgreSQL 密码
- MinIO 密码或外部 S3 凭证
- `AUTH_URL`
- `S3_PUBLIC_ENDPOINT`

## 验证

```bash
npm run lint
npm run test
npm run build
```
