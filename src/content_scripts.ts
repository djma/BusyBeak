// import { browser } from "webextension-polyfill-ts"; // Makes the extension not work if uncommented??

const OPENAI_KEY = "";
const PINECONE_KEY = "";

console.log("Hello from content script!");

const debouncer: Map<string, Date> = new Map();

const observer = new MutationObserver(async (mutations) => {
  for (const mutation of mutations) {
    await handleMutation(mutation);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true,
});

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

async function getTweetEmbedding(tweetText: string) {
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

  //   console.log("response: ", respJson);
  return respJson as EmbeddingResponse;
}

interface ClosestTweets {
  matches: {
    id: string;
    score: number;
    values?: number[];
  }[];
  namespace: string;
}

async function handleMutation(mutation: MutationRecord) {
  if (mutation.addedNodes.length > 0) {
    for (const node of mutation.addedNodes) {
      if (window.location.href.match(/twitter\.com\/\w+\/status\/\d+/)) {
        const topLevelTweet = node.ownerDocument?.querySelector(
          `article[data-testid="tweet"][tabIndex="-1"]`
        );
        if (topLevelTweet) {
          if (
            debouncer.get(window.location.href) == null ||
            debouncer.get(window.location.href)! < new Date()
          ) {
            debouncer.set(window.location.href, new Date(Date.now() + 1000));

            const tweetText = topLevelTweet.querySelector(
              '[data-testid="tweetText'
            )?.textContent;
            const embedding = await memoEmbeddingForTweet({
              tweetUrl: window.location.href,
              tweetText,
            });

            const closestTweets: ClosestTweets = await fetch(
              "https://tweets-998dab3.svc.us-west1-gcp.pinecone.io/query",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Api-Key": PINECONE_KEY,
                },
                body: JSON.stringify({
                  vector: embedding,
                  topK: 2, // first one is the tweet itself
                  includeValues: false,
                }),
              }
            ).then((response) => response.json());

            console.log(
              "closest tweet: ",
              `https://twitter.com/t/status/${closestTweets.matches[1].id}`
            ); // first one is the tweet itself
          }
        }
      }

      if (node.nodeName === "DIV") {
        node.ownerDocument
          ?.querySelector(`div[aria-label="Timeline: Trending now"]`)
          ?.remove();
        node.ownerDocument
          ?.querySelector(`aside[aria-label="Relevant people"]`)
          ?.remove();
        node.ownerDocument
          ?.querySelector(`aside[aria-label="Who to follow"]`)
          ?.remove();
      }

      const tweets =
        node.ownerDocument?.querySelectorAll('article[data-testid="tweet"]') ||
        [];

      for (const tweet of tweets) {
        const tweetLinks = tweet.querySelectorAll(`a[role="link"]`);
        for (const link of tweetLinks) {
          const href = link?.getAttribute("href");

          // matches "/<username>/status/<tweetId>"
          const tweetUrl = href?.match(/\/\w+\/status\/\d+$/) ? href : null;

          if (tweetUrl == null || debouncer.has(tweetUrl)) {
            continue;
          }

          //   console.log("Tweet url: ", tweetUrl);
          const tweetText = tweet.querySelector(
            '[data-testid="tweetText'
          )?.textContent;
          //   console.log("Tweet text: ", tweetText);

          debouncer.set(tweetUrl, new Date());

          const isReply = tweet.textContent?.includes("Replying to"); // hack
          if (!isReply) {
            // browser.runtime.sendMessage({
            //   type: "tweet",
            //   tweetUrl,
            // });
            // background to process tweet?

            memoEmbeddingForTweet({ tweetUrl, tweetText });
          }
        }
      }
    }
  }
}

async function memoEmbeddingForTweet({
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
  } = await fetch(
    "https://tweets-998dab3.svc.us-west1-gcp.pinecone.io/vectors/fetch?ids=" +
      tweetId,
    {
      method: "GET",
      headers: {
        "Api-Key": PINECONE_KEY,
      },
    }
  ).then((response) => response.json());
  //   console.log("stored embedding: ", storedEmbedding);
  if (tweetId in storedEmbedding.vectors) {
    console.log("Already have embedding for tweet: ", tweetUrl);
    return storedEmbedding.vectors[tweetId].values;
  }

  const embeddingResp = await getTweetEmbedding(tweetText!);
  console.log("uploading embedding to pinecone: ", tweetUrl);
  const upsert = {
    vectors: [
      {
        id: tweetId,
        metadata: {},
        values: embeddingResp.data[0].embedding,
      },
    ],
    //   namespace: "foo",
  };
  await fetch(
    "https://tweets-998dab3.svc.us-west1-gcp.pinecone.io/vectors/upsert",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": PINECONE_KEY,
      },
      body: JSON.stringify(upsert),
    }
  ).catch((err) => console.log("error: ", err));

  return upsert.vectors[0].values;
}
