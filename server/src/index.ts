import {
  DiscordMessage,
  DiscordUser,
  PrismaClient,
  Tweet,
  TwitterUser,
} from "@prisma/client";
import express, { Request, Response } from "express";
import reflect from "./reflect";

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.send("Welcome to the API");
});

// API route to create a user
app.post("/api/TwitterUser/upsert", async (req: Request, res: Response) => {
  console.log("Creating user", req.body);
  const item: Partial<TwitterUser> = req.body;
  const twitterUser = await prisma.twitterUser.upsert({
    where: {
      twitterId: item.twitterId,
    },
    update: {
      displayName: item.displayName,
    },
    create: {
      twitterId: item.twitterId!,
      username: item.username!,
      displayName: item.displayName!,
    },
    select: {
      id: true,
    },
  });
  res.status(201).json(twitterUser);
});

// API route to create a tweet
app.post("/api/Tweet/upsert", async (req: Request, res: Response) => {
  console.log("Creating tweet", req.body);
  const item: Partial<Tweet> = req.body;
  await prisma.tweet.upsert({
    where: {
      twitterId: item.twitterId,
    },
    update: {
      content: item.content,
      authorId: item.authorId,
      date: item.date,
      contentEmbedding: item.contentEmbedding,
      replyToTid: item.replyToTid,
    },
    create: {
      twitterId: item.twitterId!,
      content: item.content!,
      authorId: item.authorId!,
      date: item.date,
      contentEmbedding: item.contentEmbedding,
      replyToTid: item.replyToTid,
    },
  });
  res.status(201).json({ message: "Tweet created" });
});

// API route to get tweet summary
app.post(
  "/api/Reflection/getTweetSummary",
  async (req: Request, res: Response) => {
    console.log("Getting tweet summary");
    const reflection = await prisma.reflection.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(201).json(reflection);
  }
);

// API route to create a discord user
app.post("/api/DiscordUser/upsert", async (req: Request, res: Response) => {
  console.log("Creating discord user", req.body);
  const item: Partial<DiscordUser> = req.body;
  const discordUser = await prisma.discordUser.upsert({
    where: {
      discordId: item.discordId,
    },
    update: {
      username: item.username,
      displayName: item.displayName,
    },
    create: {
      discordId: item.discordId!,
      username: item.username!,
      displayName: item.displayName!,
    },
    select: {
      id: true,
    },
  });
  res.status(201).json(discordUser);
});

// API route to create a discord message
app.post("/api/DiscordMessage/upsert", async (req: Request, res: Response) => {
  console.log("Creating discord message", req.body);
  const item: Partial<DiscordMessage> = req.body;
  await prisma.discordMessage.upsert({
    where: {
      serverId_channelId_discordId: {
        serverId: item.serverId!,
        channelId: item.channelId!,
        discordId: item.discordId!,
      },
    },
    update: {
      content: item.content,
      authorId: item.authorId,
      date: item.date,
      replyToDid: item.replyToDid,
    },
    create: {
      serverId: item.serverId!,
      channelId: item.channelId!,
      discordId: item.discordId!,
      content: item.content!,
      authorId: item.authorId!,
      date: item.date!,
      replyToDid: item.replyToDid,
    },
  });
  res.status(201).json({ message: "Discord message created" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

reflect();
