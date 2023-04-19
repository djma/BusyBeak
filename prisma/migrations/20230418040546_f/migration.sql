/*
  Warnings:

  - Added the required column `authorId` to the `DiscordMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DiscordMessage" ADD COLUMN     "authorId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "DiscordMessage" ADD CONSTRAINT "DiscordMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "DiscordUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
