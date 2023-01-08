import { ContentAddressable, sha1hex, TweetMeta } from "../common/messages";
import { validateTweetUrl } from "../common/validate";
import { OPENAI_KEY } from "./config";
import { loadVec, saveVecs } from "./vector_search";

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

export async function getTweetEmbedding(
  tweetText: string
): Promise<EmbeddingResponse> {
  console.log("fetching tweet embedding for: ", tweetText.substring(0, 20));
  const respJson = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + OPENAI_KEY,
    },
    body: JSON.stringify({
      input: tweetText,
      model: "text-embedding-ada-002",
    }),
  }).then((response) => response.json());

  return respJson as EmbeddingResponse;
}

export async function saveTweetEmbed({
  tweetUrl,
  tweetMeta,
}: {
  tweetUrl: string;
  tweetMeta: ContentAddressable;
}): Promise<number[]> {
  validateTweetUrl(tweetUrl);

  // Check if we've already saved this tweet.
  const vec = await loadVec(tweetMeta);
  if (vec != null) {
    console.log("Already have embedding for tweet: ", tweetUrl);
    return vec.values;
  }

  // Otherwise, generate an embedding using the OpenAI API.
  const embeddingResp = await getTweetEmbedding(tweetMeta.preimage());
  const embedding = embeddingResp.data[0].embedding;
  if (embedding.length !== 1536) {
    console.log("Expected float[1536], got: ", embeddingResp);
    throw new Error("Unexpected embedding length");
  }

  // Save the embedding to Pinecone.
  console.log("Saving embedding to pinecone: ", tweetUrl);
  const metaDigest = await tweetMeta.digest();

  const vectors = [
    {
      id: metaDigest,
      metadata: tweetMeta,
      values: embedding,
    },
  ];
  await saveVecs(vectors);

  return vectors[0].values;
}
