import { PrismaClient, Tweet, TwitterUser } from "@prisma/client";
import express, { Request, Response } from "express";

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
    },
    create: {
      twitterId: item.twitterId!,
      content: item.content!,
      authorId: item.authorId!,
      date: item.date,
    },
  });
  res.status(201).json({ message: "Tweet created" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
