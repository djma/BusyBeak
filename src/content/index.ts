import { browser } from "webextension-polyfill-ts";
import { ensure, ensureNotNull } from "../common/assert";
import { ItemTweet, MessageRes, ResultVec } from "../common/messages";
import { extractAndSaveTweets, tryExtractTweet } from "./extract_tweets";
import { renderRelatedTweets } from "./render_related_tweets";

console.log("Hello from content script");

// Whenever we navigate to a specific tweet, show similar tweets
let lastUrl = ""; // Last URL we visited
let lastTweetUrl = ""; // Last specific tweet we visited
let lastRenderKey = ""; // Last time we rendered the sidebar.
type TweetVec = ResultVec<ItemTweet>;
let relatedTweets = [] as TweetVec[];

browser.runtime.onMessage.addListener((message: MessageRes) => {
  console.log("Received message: ", message);

  switch (message.type) {
    case "related-tweets":
      const { tweetUrl, relatedTweets } = message;
      showRelatedTweets(tweetUrl, relatedTweets);
      break;

    default:
      console.error("Unknown message type: ", message.type);
  }
});

// Save tweets as we scroll the timeline
const observer = new MutationObserver(async (mutations) => {
  // Detect navigation; popstate, hashchange events etc are all unreliable.
  handleNav();

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
  if (mutation.addedNodes.length === 0) return;
  extractAndSaveTweets();
  maybeRenderSidebar();
}

async function handleNav() {
  const url = window.location.href;
  if (url !== lastUrl) {
    console.log("New URL: ", url);
    lastUrl = url;
    maybeRenderSidebar();
  }

  if (!url.match(/twitter\.com\/\w+\/status\/\d+$/)) return;

  // Wait for the tweet to load
  const topTweetElem = document.querySelector(
    `article[data-testid="tweet"][tabIndex="-1"]`
  );
  if (topTweetElem == null) return;

  // Record that we're on this tweet
  if (lastTweetUrl == url) return;
  lastTweetUrl = url;

  // Extract the text
  const topTweet = ensureNotNull(tryExtractTweet(topTweetElem));
  ensure(url === topTweet.url, `URL mismatch ${url} ${topTweet.url}`);
  console.log(`Navigated to ${topTweet.url}`);
  if (topTweet.text == null || topTweet.text === "") return;

  // Search for related tweets
  browser.runtime.sendMessage({ type: "search-related", tweet: topTweet });
}

function showRelatedTweets(tweetUrl: string, relatedTweetVecs: TweetVec[]) {
  if (tweetUrl !== lastTweetUrl) return;
  relatedTweets = relatedTweetVecs;
  maybeRenderSidebar();
}

function maybeRenderSidebar() {
  if (lastUrl !== window.location.href) return;
  const elem = document.querySelector('[aria-label="Timeline: Trending now"]');
  if (elem == null) return;

  const renderKey = `${lastUrl}:${relatedTweets.length}`;
  if (renderKey === lastRenderKey) return;
  lastRenderKey = renderKey;

  console.log(`Rendering ${renderKey}`);
  renderSidebar(elem);
}

function renderSidebar(elem: Element) {
  if (lastUrl === lastTweetUrl) {
    // On the tweet page, render related tweets.
    elem.replaceChildren(renderRelatedTweets(relatedTweets));
  } else {
    // On the timeline, leave the sidebar alone.
  }
}
