-- DropIndex
DROP INDEX "Tweet_contentEmbedding_idx";

-- AlterTable
ALTER TABLE "Tweet" ADD COLUMN     "replyToTid" TEXT;

-- CreateIndex
CREATE INDEX "Tweet_twitterId_idx" ON "Tweet"("twitterId");
