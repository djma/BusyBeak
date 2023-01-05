// import { browser } from "webextension-polyfill-ts"; // Makes the extension not work if uncommented??

const OPENAI_KEY = "";
const PINECONE_KEY = "";

console.log("Hello from content script!");

// debounce with lifecycle of page refresh
const seenTweets = new Set();

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

  console.log("response: ", respJson);
  return respJson as EmbeddingResponse;
}

async function handleMutation(mutation: MutationRecord) {
  if (mutation.addedNodes.length > 0) {
    for (const node of mutation.addedNodes) {
      const tweets =
        node.ownerDocument?.querySelectorAll('[data-testid="tweet"]') || [];

      for (const tweet of tweets) {
        const tweetLinks = tweet.querySelectorAll(`a[role="link"]`);
        for (const link of tweetLinks) {
          const href = link?.getAttribute("href");

          // matches "/<username>/status/<tweetId>"
          const tweetUrl = href?.match(/\/\w+\/status\/\d+$/) ? href : null;

          if (tweetUrl == null || seenTweets.has(tweetUrl)) {
            continue;
          }

          console.log("Tweet url: ", tweetUrl);
          const tweetText = tweet.querySelector(
            '[data-testid="tweetText'
          )?.textContent;
          console.log("Tweet text: ", tweetText);

          seenTweets.add(tweetUrl);

          const isReply = tweet.textContent?.includes("Replying to"); // hack
          if (!isReply) {
            const tweetId = tweetUrl.split("/").slice(-1)[0];
            // browser.runtime.sendMessage({
            //   type: "tweet",
            //   tweetUrl,
            // });
            // background to process tweet?

            // try fetching the embedding for the tweet url from pinecone
            const storedEmbedding = await fetch(
              "https://tweets-998dab3.svc.us-west1-gcp.pinecone.io/vectors/fetch?ids=" +
                tweetId,
              {
                method: "GET",
                headers: {
                  "Api-Key": PINECONE_KEY,
                },
              }
            ).then((response) => response.json());
            console.log("stored embedding: ", storedEmbedding);
            if (tweetId in storedEmbedding.vectors) {
              console.log("Already have embedding for tweet: ", tweetUrl);
              continue;
            }

            const embeddingResp = await getTweetEmbedding(tweetText!);
            console.log("uploading embedding to pinecone");
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
          }
        }
      }
    }
  }
}
