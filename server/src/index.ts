import { PrismaClient, Tweet, TwitterUser } from "@prisma/client";
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
    },
    create: {
      twitterId: item.twitterId!,
      content: item.content!,
      authorId: item.authorId!,
      date: item.date,
      contentEmbedding: item.contentEmbedding,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

reflect();
