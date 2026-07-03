-- CreateTable
CREATE TABLE "LlmConfig" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmSkill" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "systemPrompt" TEXT NOT NULL,
    "fieldHints" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmSkill_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Session" ADD COLUMN "skillId" TEXT;
ALTER TABLE "Session" ADD COLUMN "aiGenerated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Session" ADD COLUMN "aiRawResponse" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "LlmConfig_groupId_key" ON "LlmConfig"("groupId");

-- CreateIndex
CREATE INDEX "LlmConfig_groupId_idx" ON "LlmConfig"("groupId");

-- CreateIndex
CREATE INDEX "LlmSkill_groupId_idx" ON "LlmSkill"("groupId");

-- CreateIndex
CREATE INDEX "Session_skillId_idx" ON "Session"("skillId");

-- AddForeignKey
ALTER TABLE "LlmConfig" ADD CONSTRAINT "LlmConfig_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmSkill" ADD CONSTRAINT "LlmSkill_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "LlmSkill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
