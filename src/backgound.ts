import { browser } from "webextension-polyfill-ts";

// receive message from content_scripts.ts
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "tweet") {
    console.log("Received tweet: ", message.tweetUrl);
  }
});
