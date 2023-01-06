import { browser } from "webextension-polyfill-ts";

console.log("Hello from content script");

// Save tweets as we scroll the timeline
const savedTweetIds = new Set<string>();
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

// Whenever we navigate to a specific tweet, show similar tweets
handleNavigate();
window.addEventListener("popstate", handleNavigate);

async function handleNavigate() {
  const { href } = window.location;
  console.log(`Navigated to ${href}`);

  if (!href.match(/twitter\.com\/\w+\/status\/\d+$/)) return;
  const topLevelTweet = document.querySelector(
    `article[data-testid="tweet"][tabIndex="-1"]`
  );
  if (topLevelTweet == null) return;
  const tweetText = topLevelTweet.querySelector(
    '[data-testid="tweetText"]'
  )?.textContent;

  console.log(`Top tweet text: ${tweetText}`);
  const tweetUrl = window.location.href;
  browser.runtime.sendMessage({ type: "search", tweetText, tweetUrl });
}

async function handleMutation(mutation: MutationRecord) {
  if (mutation.addedNodes.length === 0) return;
  const tweets =
    document.querySelectorAll('article[data-testid="tweet"]') || [];

  for (const tweet of tweets) {
    const tweetText = tweet.querySelector(
      '[data-testid="tweetText"]'
    )?.textContent;

    // Hack: skip replies
    const isReply = tweet.textContent?.includes("Replying to");
    if (isReply) continue;

    const tweetLinks = tweet.querySelectorAll(`a[role="link"]`);
    for (const link of tweetLinks) {
      const href = link?.getAttribute("href");
      const tweetUrl = href?.match(/\/\w+\/status\/\d+$/) ? href : null;

      // Skip if we've already saved this tweet
      if (tweetUrl == null || savedTweetIds.has(tweetUrl)) continue;
      savedTweetIds.add(tweetUrl);

      browser.runtime.sendMessage({ type: "save", tweetText, tweetUrl });
    }
  }
}
