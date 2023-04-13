-- AlterTable
ALTER TABLE "Tweet" ADD COLUMN     "contentEmbedding" TEXT;

-- CreateTable
CREATE TABLE "Reflection" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "contentEmbedding" TEXT,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reflection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reflection_contentEmbedding_idx" ON "Reflection"("contentEmbedding");

-- CreateIndex
CREATE INDEX "Tweet_contentEmbedding_idx" ON "Tweet"("contentEmbedding");
