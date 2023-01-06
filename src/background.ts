import { findClosestTweet, saveTweetEmbed } from "tweet_search";
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

      case "search":
        console.log("Saving top tweet tweet: ", tweetUrl);
        const embedding = await saveTweetEmbed({ tweetUrl, tweetText });
        console.log(
          "Looking up closest tweet, len(embedding) = " + embedding.length
        );
        const id = await findClosestTweet(embedding);
        console.log(`Closest tweet: https://twitter.com/t/status/${id}`);
    }
  } catch (e) {
    console.error(e);
  }
});
