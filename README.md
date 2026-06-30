# Pancake

Pancake 是一个摄影群组协作 MVP。用户可以创建或加入群组，在群组中创建 Session，并按「思维火花」「规划」「反馈」三个阶段推进一次拍摄。

## 功能

- 邮箱密码注册与登录
- 群组创建、邀请码加入
- Session 看板，按三个阶段分列
- 思维火花字段保存
- Markdown 摄影策划编辑与安全预览
- 作品照片上传到 S3 兼容存储，反馈区瀑布流展示
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
