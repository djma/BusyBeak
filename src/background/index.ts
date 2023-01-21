import { browser, Runtime } from "webextension-polyfill-ts";
import { ArticleData } from "@extractus/article-extractor";

import { Item, MessageReq, MessageRes, ResultVec } from "../common/messages";
import { getTextEmbeddings, embedAndSaveItems } from "./tweet_search";
import { findClosestK, loadVecs, saveVecs } from "./vector_search";
import { ensure } from "../common/assert";

console.log("Background hello world");

// Extension API main entry point.
// The background gets requests from the page. See content_scripts.ts
browser.runtime.onMessage.addListener(async (message: MessageReq, sender) => {
  try {
    switch (message.type) {
      case "save":
        console.log("Saving tweets", message);
        await embedAndSaveItems(message.items);
        break;

      case "search-related":
        console.log("Saving top tweet", message);
        await searchRelated(message, sender);
        break;

      case "popup-search":
        await popupSearch(message);
        break;

      case "save-article":
        await embedAndSaveArticle(message.article, message.url);
        break;

      default:
        console.error("Unknown message type", message);
    }
  } catch (e) {
    console.error(e);
  }
});

function sendResponse(tabId: number, message: MessageRes) {
  browser.tabs.sendMessage(tabId, message);
}

async function searchRelated(
  message: MessageReq,
  sender: Runtime.MessageSender
) {
  if (sender.tab == null || sender.tab.id == null) {
    console.error("Skipping message, missing sender.tab", message);
    return;
  }

  ensure(message.type === "search-related");

  const embedding = (await embedAndSaveItems([message.tweet]))[0];
  console.log("Looking up related tweets");
  const vecs = await findClosestK(embedding.values, 3 + 1); // +1 to skip the original tweet
  let filtered = vecs.filter((v) => v.id !== message.tweet.url);
  console.log("Closest K", filtered);

  sendResponse(sender.tab.id, {
    type: "related-tweets",
    tweetUrl: message.tweet.url,
    relatedTweets: filtered,
  });
}

async function popupSearch(message: MessageReq) {
  ensure(message.type === "popup-search");
  const query = message.query;
  const embedding = (await getTextEmbeddings([query])).data[0].embedding;
  console.log("Looking up closest tweet, len(embedding) = " + embedding.length);
  const vecs = (await findClosestK(embedding, 3)) as ResultVec<Item>[];

  for (const vec of vecs) {
    console.log(`Related tweet: ${vec.id}`);
  }

  const channel = new BroadcastChannel("POP_UP_CHANNEL");
  channel.postMessage({
    type: "related-tweets",
    tweetUrl: "",
    relatedTweets: vecs,
  });
}

async function embedAndSaveArticle(article: ArticleData, url: string) {
  const cleanUrl = url.split("?")[0];
  const vecs = await loadVecs([cleanUrl]);
  if (vecs[0] != null) {
    console.log("Already saved article", cleanUrl);
    console.log(vecs);
    return;
  }

  console.log("Saving article", cleanUrl);
  const embeddingResp = await getTextEmbeddings([
    // https://stackoverflow.com/questions/5002111/how-to-strip-html-tags-from-string-in-javascript
    chopEmbeddingInput(article.content!.replace(/<\/?[^>]+(>|$)/g, "")),
  ]);

  const embeddings = embeddingResp.data.map((d) => d.embedding);

  // Save the embedding to Pinecone.
  console.log(`Saving ${embeddings.length} embeddings to Pinecone...`);
  const vecsToSave = [
    {
      id: cleanUrl,
      metadata: {
        title: article.title,
        description: article.description,
        url: cleanUrl,
        // content: article.content, // too big?
        type: "article",
      },
      values: embeddings[0],
    },
  ];
  await saveVecs(vecsToSave);
}

/** Hacky function to chop off the end of a string to make it fit in the GPT-3 encoder.  */
function chopEmbeddingInput(text: string): string {
  const maxTokens = 8191;

  // Can't use encode/decode because the gpt-3-encoder requires fs and path.
  // const encoded = encode(text);
  // return decode(encoded.slice(0, maxTokens));

  // 4-character heuristic from: https://beta.openai.com/tokenizer
  return text.slice(0, maxTokens * 4 * 0.99);
}
