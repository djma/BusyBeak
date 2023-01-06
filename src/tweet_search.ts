import { OPENAI_KEY, PINECONE_BASE_URL, PINECONE_KEY } from "./config";

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
  tweetId,
  tweetText,
}: {
  tweetUrl?: string;
  tweetId?: string;
  tweetText?: string | null;
}) {
  tweetId = tweetId || tweetUrl!.split("/").slice(-1)[0];

  const storedEmbedding: {
    vectors: Record<string, { id: string; values: number[] }>;
  } = await fetch(`${PINECONE_BASE_URL}/vectors/fetch?ids=${tweetId}`, {
    method: "GET",
    headers: {
      "Api-Key": PINECONE_KEY,
    },
  }).then((response) => response.json());
  if (tweetId in storedEmbedding.vectors) {
    console.log("Already have embedding for tweet: ", tweetUrl);
    return storedEmbedding.vectors[tweetId].values;
  }

  const embeddingResp = await getTweetEmbedding(tweetText!);
  const embedding = embeddingResp.data[0].embedding;
  if (embedding.length !== 1536) {
    console.log("Expected float[1536], got: ", embeddingResp);
    throw new Error("Unexpected embedding length");
  }

  console.log("uploading embedding to pinecone: ", tweetUrl);
  const upsert = {
    vectors: [
      {
        id: tweetId,
        metadata: {},
        values: embedding,
      },
    ],
  };
  const resp = await fetch(`${PINECONE_BASE_URL}/vectors/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": PINECONE_KEY,
    },
    body: JSON.stringify(upsert),
  }).catch((err) => console.log("error: ", err));
  console.log("Upsert response: ", resp);

  return upsert.vectors[0].values;
}
