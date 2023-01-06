import { browser } from "webextension-polyfill-ts";

console.log("Hello from content script");

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

async function handleMutation(mutation: MutationRecord) {
  if (mutation.addedNodes.length > 0) {
    for (const node of mutation.addedNodes) {
      if (window.location.href.match(/twitter\.com\/\w+\/status\/\d+$/)) {
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

            console.log("TOP TWEET TEXT: ", tweetText);
            const tweetUrl = window.location.href;
            browser.runtime.sendMessage({
              type: "search",
              tweetText,
              tweetUrl,
            });
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

          const tweetUrl = href?.match(/\/\w+\/status\/\d+$/) ? href : null;

          if (tweetUrl == null || debouncer.has(tweetUrl)) {
            continue;
          }

          const tweetText = tweet.querySelector(
            '[data-testid="tweetText'
          )?.textContent;

          debouncer.set(tweetUrl, new Date());

          const isReply = tweet.textContent?.includes("Replying to"); // hack
          if (!isReply) {
            browser.runtime.sendMessage({ type: "save", tweetText, tweetUrl });
          }
        }
      }
    }
  }
}
