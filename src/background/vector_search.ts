import { sha1hex, TweetMeta } from "common/messages";
import { PINECONE_BASE_URL, PINECONE_KEY } from "./config";

/** A list of vectors from querying the vector DB. */
export interface PineconeResponse {
  matches: PineconeScoreVector[];
  namespace: string;
}

/** A single vector. Queries can optionally request values or just id,score. */
export interface PineconeScoreVector {
  id: string;
  score: number;
  values?: number[];
}

/** A single vector. */
export interface PineconeVector {
  id: string;
  metadata: {};
  values: number[];
}

export async function loadVec(tweetMeta: TweetMeta): Promise<PineconeVector> {
  const id = await sha1hex(tweetMeta.text);
  const url = `${PINECONE_BASE_URL}/vectors/fetch?ids=${encodeURIComponent(
    id
  )}`;
  console.log(`Fetching ${url}`);
  const storedEmbedding: {
    vectors: Record<string, PineconeVector>;
  } = await fetch(url, {
    method: "GET",
    headers: { "Api-Key": PINECONE_KEY },
  })
    .then((response) => response.json())
    .catch((err) => {
      console.log("error: ", err);
      return { vectors: {} };
    });
  return storedEmbedding.vectors[id];
}

/** Finds the closest vectors to a given vector. */
export async function findClosestK(
  vector: number[],
  k: number
): Promise<PineconeScoreVector[]> {
  const closestTweets: PineconeResponse = await fetch(
    `${PINECONE_BASE_URL}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": PINECONE_KEY,
      },
      body: JSON.stringify({
        vector,
        topK: k + 1, // first one is the query vector itself
        includeValues: false,
        includeMetadata: true,
      }),
    }
  ).then((response) => response.json());
  if (closestTweets.matches == null) {
    console.error("Bad query response", closestTweets);
    return [];
  }
  return closestTweets.matches.slice(1);
}

export async function saveVecs(vectors: PineconeVector[]) {
  const upsert = { vectors };
  const resp = await fetch(`${PINECONE_BASE_URL}/vectors/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": PINECONE_KEY,
    },
    body: JSON.stringify(upsert),
  }).catch((err) => console.log("error: ", err));
  console.log("Upsert response: ", resp);
}
