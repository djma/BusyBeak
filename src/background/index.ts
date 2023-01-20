import { browser, Runtime } from "webextension-polyfill-ts";
import { extractFromHtml } from "@extractus/article-extractor";

import {
  ItemTweet,
  MessageReq,
  MessageRes,
  ResultVec,
} from "../common/messages";
import { getTextEmbeddings, embedAndSaveItems } from "./tweet_search";
import { findClosestK } from "./vector_search";
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

      case "extract-article":
        extractArticle(message.html, message.url);
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

async function extractArticle(html: string, url: string) {
  const data = await extractFromHtml(html, url);
  // lastArticle = data;
  console.log("Extracted article, length: ", data?.content?.length);
  // // heuristic, wait for article to render for 5s before extracting
  // if (lastUrlTime + 5000 > Date.now()) return;
  // nextSaveId = window.setTimeout(() => {
  //   console.log(`Saving ${tweetsToSave.length} tweets`);
  //   sendRequest({ type: "save", items: tweetsToSave.slice() });
  //   nextSaveId = 0;
  //   tweetsToSave.length = 0;
  // }, 5000);
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
  const vecs = (await findClosestK(embedding, 3)) as ResultVec<ItemTweet>[];

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
