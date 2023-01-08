import { browser, Runtime } from "webextension-polyfill-ts";

import {
  MessageReq,
  MessageRes,
  TweetMeta,
  TweetVec,
} from "../common/messages";
import { getTweetEmbedding, saveTweetEmbed } from "./tweet_search";
import { findClosestK } from "./vector_search";
import { ensure } from "../common/assert";

console.log("Background hello world");

// Extension API main entry point.
// The background gets requests from the page. See content_scripts.ts
browser.runtime.onMessage.addListener(async (message: MessageReq, sender) => {
  try {
    switch (message.type) {
      case "save":
        message.tweetMeta = new TweetMeta(message.tweetMeta);
        console.log("Saving tweet", message);
        await saveTweetEmbed(message);
        break;

      case "search-related":
        message.tweetMeta = new TweetMeta(message.tweetMeta);
        console.log("Saving top tweet", message);
        await searchRelated(message, sender);
        break;

      case "popup-search":
        await popupSearch(message);
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

  const embedding = await saveTweetEmbed(message);
  console.log("Looking up related tweets");
  const vecs = (await findClosestK(embedding, 3)) as TweetVec[];
  console.log("Closest K", vecs);

  let filtered = vecs.filter((v) => !v.metadata.isReply);
  if (filtered.length === 0) filtered = vecs;

  sendResponse(sender.tab.id, {
    type: "related-tweets",
    tweetUrl: message.tweetUrl,
    relatedTweets: filtered,
  });
}

async function popupSearch(message: MessageReq) {
  ensure(message.type === "popup-search");
  const query = message.query;
  const embedding = (await getTweetEmbedding(query)).data[0].embedding;
  console.log("Looking up closest tweet, len(embedding) = " + embedding.length);
  const vecs = (await findClosestK(embedding, 3)) as TweetVec[];

  for (const vec of vecs) {
    console.log(`Related tweet: ${vec.metadata.url}`);
  }

  const channel = new BroadcastChannel("POP_UP_CHANNEL");
  channel.postMessage({
    type: "related-tweets",
    tweetUrl: "",
    relatedTweets: vecs,
  });

  // send message back to popup?
  // browser.,{
  //   type: "related-tweets",
  //   tweetUrl: "",
  //   relatedTweets: vecs,
  // });
}
