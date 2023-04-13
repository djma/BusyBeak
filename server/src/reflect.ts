import { OpenAI } from "langchain/llms/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import KvStoreService from "./kvstore";
import { LocalDate } from "./time";

dotenv.config();
const prisma = new PrismaClient();
const kvStore = new KvStoreService();

/**
 * - Load tweets from today (Los Angeles time) that are not already reflected
 * - If there are fewer than 3000 characters of tweets, stop here.
 * - Chop the tweets until there are fewer than 3000 characters
 * - Load the last reflection from today
 * - Generate and save reflection
 * - Update the processed tweets pointer in kvstore
 */
async function reflect() {
  const startOfDay = LocalDate.todayLA().toMidnightDate("America/Los_Angeles");
  console.log("Start of day", startOfDay);

  const lastTweetReflectedOnCreatedAt = new Date(
    (await kvStore.get("lastTweetReflectedOnCreatedAt")) ??
      startOfDay.toISOString()
  );

  const tweets = await prisma.tweet.findMany({
    where: {
      createdAt: {
        gte:
          startOfDay > lastTweetReflectedOnCreatedAt
            ? startOfDay
            : lastTweetReflectedOnCreatedAt,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      author: {
        select: {
          twitterId: true,
        },
      },
    },
  });

  let tweetsBlock = "";
  let tweetsBlockLastCreatedAt = lastTweetReflectedOnCreatedAt;
  while (tweetsBlock.length < 3000) {
    const t = tweets.shift();
    if (!t) {
      console.log("Less than 3000 characters of tweets, stopping here.");
      return;
    }

    tweetsBlock += `${t.author.twitterId}: ${t.content.replaceAll("\n", " ")}`;
    tweetsBlockLastCreatedAt = t.createdAt;
  }

  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 3000 });
  const docs = await textSplitter.createDocuments([tweetsBlock]);

  const lastReflection = await prisma.reflection.findFirst({
    where: {
      createdAt: {
        gte: startOfDay,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const lastReflectionContent =
    lastReflection?.content ??
    "High level themes are cryptocurrency (web3) and AI.";

  const summaryModel = new OpenAI({
    // temperature: 0,
    modelName: "gpt-3.5-turbo",
  });

  const prompt = `The following is a set of tweets in chronological order that appeared in my timeline.
I generally follow cryptocurrency and AI topics, so those are of particular interest to me.
Your goal is to find themes and theses of the day by inferring what people are talking about.
Make sure to group your summary by topic. Do not jump around. When the summary is longer than a page, summarize it down.

Here is your running summary of your understanding from the previous tweets:
${lastReflectionContent}

Here are the next tweets:
${docs[0].pageContent}

Update the summary to reflect your refined understanding. Carry over any information you think you will need.
`;
  const reflection = await summaryModel.call(prompt);

  console.log(reflection);

  await prisma.reflection.create({
    data: {
      content: reflection,
      prompt: prompt,
    },
  });

  await kvStore.set(
    "lastTweetReflectedOnCreatedAt",
    tweetsBlockLastCreatedAt.toISOString()
  );
}

/**
 * Loop reflection every 5 minutes
 */
export default async function main() {
  while (true) {
    await reflect();
    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
  }
}
