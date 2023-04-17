import { Tweet, TwitterUser } from "@prisma/client";
import { ensure } from "common/assert";
import { ItemTweet } from "../common/messages";
import { PineconeVector, loadVecs, saveVecs } from "./vector_search";

/** A vector embedding for a single tweet. */
interface EmbeddingResponse {
  data: {
    embedding: number[];
    index: number;
    object: string;
  }[];
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/** Gets OpenAI embedding vectors for each of a list of strings. */
export async function getTextEmbeddings(
  texts: string[]
): Promise<EmbeddingResponse> {
  console.log(`Embedding ${texts.length} texts...`);
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.OPENAI_KEY,
    },
    body: JSON.stringify({
      input: texts,
      model: "text-embedding-ada-002",
    }),
  });
  if (!resp.ok) {
    console.error("Error fetching embedding", resp.status, resp.statusText);
    console.error("Error response body", await resp.text());
  }
  return (await resp.json()) as EmbeddingResponse;
}

/**
 * @param items
 * @returns embeddings for all items. If an item was already saved, it
 * will be loaded from Pinecone. If it was not saved, it will embed them
 * with OpenAI API and then save them to Pinecone.
 */
export async function getTweetEmbeddings(
  items: ItemTweet[]
): Promise<PineconeVector[]> {
  // Check if we've already saved some or all of them.
  const vecs = await loadVecs(items.map((item) => item.url!));
  console.log(`Loaded ${vecs.length} vectors`, vecs);
  const unsavedItems = items.filter((_, i) => vecs[i] == null);
  if (unsavedItems.length === 0) {
    console.log("All items already saved");
    return vecs;
  }
  console.log(`Embedding and saving ${unsavedItems.length} items...`);

  // Otherwise, generate an embedding using the OpenAI API.
  const texts = unsavedItems.map((item) => item.text);
  const embeddingResp = await getTextEmbeddings(texts);
  const embeddings = embeddingResp.data.map((d) => d.embedding);
  ensure(embeddings.length === unsavedItems.length, "Length mismatch");

  // Save the embedding to Pinecone.
  console.log(`Saving ${embeddings.length} embeddings to Pinecone...`);
  const vecsToSave = unsavedItems.map((item, i) => ({
    id: item.url,
    metadata: item,
    values: embeddings[i],
  }));
  await saveVecs(vecsToSave);

  let si = 0;
  return items.map((_, i) => vecs[i] ?? vecsToSave[si++]);
}

export async function handleTweets(items: ItemTweet[]) {
  const embeds = await getTweetEmbeddings(items);
  const itemsWithEmbedding = embeds.map((embed, i) => ({
    ...items[i],
    contentEmbedding: embed.id,
  }));
  await storeTweets(itemsWithEmbedding);
}

async function storeTweets(
  items: (ItemTweet & { contentEmbedding: string })[]
) {
  // Send tweets to database server.
  for (const item of items) {
    const twitterUser: Partial<TwitterUser> = {
      twitterId: item.authorName,
      username: item.authorName,
      displayName: item.authorDisplayName,
    };
    const resp = await fetch("http://localhost:3000/api/TwitterUser/upsert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(twitterUser),
    });
    if (!resp.ok) {
      console.error("Error storing twitter user", item, resp);
    }
    const user = await resp.json();

    const tweet: Partial<Tweet> = {
      twitterId: item.url,
      content: item.text,
      authorId: user.id,
      date: new Date(item.date),
      contentEmbedding: item.contentEmbedding,
      replyToTid: item.replyToUrl,
    };
    const tweetResp = await fetch("http://localhost:3000/api/Tweet/upsert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweet),
    });
    if (!tweetResp.ok) {
      console.error("Error storing tweet", item, resp);
    }
  }
}
