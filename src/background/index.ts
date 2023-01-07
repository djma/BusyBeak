import { browser } from "webextension-polyfill-ts";

import { MessageReq, MessageRes, TweetVec } from "../common/messages";
import { saveTweetEmbed } from "./tweet_search";
import { findClosestK } from "./vector_search";

console.log("Background hello world");

// Extension API main entry point.
// The background gets requests from the page. See content_scripts.ts
browser.runtime.onMessage.addListener(async (message: MessageReq, sender) => {
  if (sender.tab == null || sender.tab.id == null) {
    console.error("Skipping message, missing sender.tab", message);
    return;
  }

  try {
    switch (message.type) {
      case "save":
        console.log("Saving tweet", message);
        await saveTweetEmbed(message);
        break;

      case "search-related":
        console.log("Saving top tweet", message);
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
