import { browser } from "webextension-polyfill-ts";
import { ensure, ensureNotNull } from "../common/assert";
import { ItemTweet, MessageRes, ResultVec } from "../common/messages";
import { extractTweets, removeAds, tryExtractTweet } from "./extract_tweets";
import { renderRelatedTweets } from "./render_related_tweets";
// import extractor from "unfluff";
import { ArticleData, extractFromHtml } from "@extractus/article-extractor";
import { handleDiscordChannel } from "./handleDiscordChannel";

console.log("Hello from content script");

// Whenever we navigate to a specific tweet, show similar tweets
let lastUrl = ""; // Last URL we visited
let lastUrlTime = Date.parse("2100-01-01"); // Last time we changed URL
let lastTweetUrl = ""; // Last specific tweet we visited
let lastRenderKey = ""; // Last time we rendered the sidebar.
type TweetVec = ResultVec<ItemTweet>;
let relatedTweets = [] as TweetVec[];

browser.runtime.onMessage.addListener((message: MessageRes) => {
  console.log("Received message: ", message);

  switch (message.type) {
    case "related-tweets":
      const { tweetUrl, relatedTweets } = message;
      showRelatedTweets(
        tweetUrl,
        relatedTweets.filter((t) => t.metadata.type === "tweet") as TweetVec[] // todo fix typing
      );
      break;

    default:
      console.error("Unknown message type: ", message.type);
  }
});

/** Save tweets as we scroll the timeline */
const observer = new MutationObserver(async (mutations) => {
  // Detect navigation; popstate, hashchange events etc are all unreliable.
  const url = window.location.href;
  if (url !== lastUrl) {
    console.log("New URL: ", url);
    lastUrl = url;
    lastUrlTime = Date.now();
  }

  const totalAdded = mutations.reduce((sum, m) => sum + m.addedNodes.length, 0);
  if (totalAdded === 0) return;

  if (url.match(/twitter\.com\/\w+\/status\/\d+$/)) {
    handleTweetFocus(lastUrl);
  }

  if (/^https:\/\/twitter.com\//.test(lastUrl)) {
    removeAds();
    extractTweets(lastUrl);
  }

  if (/^https:\/\/discord\.com\/channels\/\d+\/\d+/.test(lastUrl)) {
    handleDiscordChannel(lastUrl);
  }

  if (
    // medium
    /^https:\/\/medium\.com\//.test(lastUrl) ||
    // wikipedia
    /^https:\/\/en\.wikipedia\.org\//.test(lastUrl) ||
    // substack
    /^https:\/\/[^\.]+\.substack\.com\//.test(lastUrl) ||
    // financial times
    /^https:\/\/www\.ft\.com\//.test(lastUrl) ||
    // axios
    /^https:\/\/www\.axios\.com\//.test(lastUrl) ||
    /^https:\/\/www\.nytimes\.com\//.test(lastUrl) ||
    /^https:\/\/www\.washingtonpost\.com\//.test(lastUrl) ||
    /^https:\/\/www\.theguardian\.com\//.test(lastUrl) ||
    /^https:\/\/www\.bbc\.com\//.test(lastUrl) ||
    /^https:\/\/www\.cnn\.com\//.test(lastUrl) ||
    /^https:\/\/www\.foxnews\.com\//.test(lastUrl) ||
    /^https:\/\/www\.npr\.org\//.test(lastUrl) ||
    /^https:\/\/www\.latimes\.com\//.test(lastUrl) ||
    /^https:\/\/www\.wsj\.com\//.test(lastUrl) ||
    /^https:\/\/www\.bloomberg\.com\//.test(lastUrl) ||
    /^https:\/\/www\.reuters\.com\//.test(lastUrl) ||
    /^https:\/\/www\.politico\.com\//.test(lastUrl) ||
    /^https:\/\/www\.huffpost\.com\//.test(lastUrl) ||
    /^https:\/\/www\.nbcnews\.com\//.test(lastUrl) ||
    /^https:\/\/www\.cnbc\.com\//.test(lastUrl) ||
    /^https:\/\/www\.abcnews\.go\.com\//.test(lastUrl) ||
    /^https:\/\/www\.apnews\.com\//.test(lastUrl)
  ) {
    await extractArticle();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true,
});

async function handleTweetFocus(url: string) {
  console.log(`handleTweetFocus(${url})`);
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

let nextSaveId = 0;
let lastArticle: ArticleData | null = null;
let hasNewArticle = false;
/** Using https://github.com/ageitgey/node-unfluff, extracts articles from webpages. Last update was 4 years ago.
 * There's a more recent but fewer stars https://github.com/extractus/article-extractor */
async function extractArticle() {
  const html = document.getElementsByTagName("html")[0].innerHTML;
  // console.log(html.length, html.slice(0, 1000));
  const article = await extractFromHtml(html, lastUrl);
  if (!lastArticle || lastArticle.content !== article?.content) {
    lastArticle = article;
    console.log(
      "Extracted article, content: ",
      article?.content?.slice(0, 1000)
    );
    hasNewArticle = true;
  }
  // console.log(article);

  if (!hasNewArticle) return;
  if (!article) return;
  if (!article.content) return;
  if (article.content.length < 300) return;
  if (nextSaveId > 0) return;

  // heuristic, wait for article to render for 5s before extracting
  nextSaveId = window.setTimeout(() => {
    console.log(`Saving article of length ${article?.content?.length}`);
    browser.runtime.sendMessage({
      type: "save-article",
      article: lastArticle,
      url: lastUrl,
    });
    nextSaveId = 0;
    hasNewArticle = false;
  }, 5000);
}
