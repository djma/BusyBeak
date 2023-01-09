import { Item, ResultVec } from "common/messages";
import { PINECONE_BASE_URL, PINECONE_KEY } from "./config";

/** A list of vectors from querying the vector DB. */
export interface PineconeResponse {
  matches: ResultVec<Item>[];
  namespace: string;
}

/** A single vector. */
export interface PineconeVector {
  /** URI that references the content */
  id: string;
  /** Embedded vector of the content */
  values: number[];
  metadata?: any;
}

export async function loadVecs(ids: string[]): Promise<PineconeVector[]> {
  const encIds = ids.map((id) => encodeURIComponent(id)).join(",");
  const url = `${PINECONE_BASE_URL}/vectors/fetch?ids=${encIds}`;
  console.log(`Fetching ${ids.length} vectors...`);
  const storedEmbedding: {
    vectors: Record<string, PineconeVector>;
  } = await fetch(url, {
    method: "GET",
    headers: { "Api-Key": PINECONE_KEY },
  }).then((response) => response.json());
  return ids.map((id) => storedEmbedding.vectors[id]);
}

/** Finds the closest vectors to a given vector. */
export async function findClosestK(
  vector: number[],
  k: number
): Promise<ResultVec<Item>[]> {
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
        topK: k,
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
