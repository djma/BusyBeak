import { PINECONE_BASE_URL, PINECONE_KEY } from "config";

/** A list of vectors from querying the vector DB. */
interface PineconeResponse {
  matches: PineconeVector[];
  namespace: string;
}

/** A single vector. Queries can optionally request values or just id,score. */
interface PineconeVector {
  id: string;
  score: number;
  values?: number[];
}

/** Finds the closest vector a given vector. */
export async function findClosest(vector: number[]): Promise<PineconeVector> {
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
        topK: 2, // first one is the query vector itself
        includeValues: false,
      }),
    }
  ).then((response) => response.json());
  return closestTweets.matches[1];
}
