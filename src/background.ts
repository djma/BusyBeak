import { saveTweetEmbed } from "tweet_search";
import { findClosest } from "vector_search";
import { browser } from "webextension-polyfill-ts";

console.log("Background hello world");

// Receive message from page, see content_scripts.ts
browser.runtime.onMessage.addListener(async (message) => {
  try {
    const { type, tweetUrl, tweetText } = message;

    switch (type) {
      case "save":
        console.log("Saving tweet: ", tweetUrl);
        await saveTweetEmbed({ tweetUrl, tweetText });
        break;

      case "search":
        console.log("Saving top tweet tweet: ", tweetUrl);
        const embedding = await saveTweetEmbed({ tweetUrl, tweetText });
        console.log(
          "Looking up closest tweet, len(embedding) = " + embedding.length
        );
        const vec = await findClosest(embedding);
        console.log(`Closest tweet: https://twitter.com/t/status/${vec.id}`);
        console.log(`Score        : ${vec.score}`);
        break;

      default:
        console.error("Unknown message type: ", type);
    }
  } catch (e) {
    console.error(e);
  }
});
