/*
  Warnings:

  - A unique constraint covering the columns `[serverId,channelId,discordId]` on the table `DiscordMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DiscordMessage_serverId_channelId_discordId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "DiscordMessage_serverId_channelId_discordId_key" ON "DiscordMessage"("serverId", "channelId", "discordId");
