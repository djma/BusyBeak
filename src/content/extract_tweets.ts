import { browser } from "webextension-polyfill-ts";
import { ensure } from "../common/assert";
import { ItemTweet, MessageReq } from "../common/messages";
import { normalizeTweetUrl } from "../common/validate";

const savedTweetIds = new Set<string>();
let nextSaveId = 0;
const tweetsToSave = [] as ItemTweet[];

/** Extracts tweets from the timeline DOM. At most once every few seconds, sends
 * a batch of them to the background proces to embed and save. */
export function extractAndSaveTweets() {
  const tweetElems =
    document.querySelectorAll('article[data-testid="tweet"]') || [];

  for (const elem of tweetElems) {
    const tweet = tryExtractTweet(elem);
    if (tweet == null) continue;

    // Skip if we've already saved this tweet
    if (tweet.url == null || savedTweetIds.has(tweet.url)) continue;
    savedTweetIds.add(tweet.url);

    // Skip empty
    if (tweet.text == null || tweet.text === "") continue;

    console.log(`Queuing to save: ${tweet.url}`);
    tweetsToSave.push(tweet);
  }
  if (tweetsToSave.length === 0) return;
  if (nextSaveId > 0) return;

  nextSaveId = window.setTimeout(() => {
    console.log(`Saving ${tweetsToSave.length} tweets`);
    sendRequest({ type: "save", items: tweetsToSave.slice() });
    nextSaveId = 0;
    tweetsToSave.length = 0;
  }, 5000);
}

export function tryExtractTweet(tweet: Element): ItemTweet | null {
  const tweetText =
    tweet.querySelector('[data-testid="tweetText"]')?.textContent || "";
  try {
    let tweetUrl, authorName, authorDisplayName, likesStr;
    const tweetLinks = tweet.querySelectorAll(`a[role="link"]`);
    for (const link of tweetLinks) {
      const href = link?.getAttribute("href");
      if (!href) continue;
      if (href.match(/\/\w+\/status\/\d+$/)) {
        tweetUrl = normalizeTweetUrl(href);
      } else if (href.match(/\/\w+\/status\/\d+\/history$/)) {
        tweetUrl = normalizeTweetUrl(href.replace(/\/history$/, ""));
      } else if (href.match(/\/\w+\/status\/\d+\/likes$/)) {
        likesStr = (link as HTMLAnchorElement).innerText.split(" ")[0].trim();
      } else if (href.match(/^\/\w+$/)) {
        if (authorDisplayName != null) continue; // First @ is the author. Others are @mentions.
        authorName = href.split("/").slice(-1)[0];
        const linkText = (link as HTMLAnchorElement).innerText.trim();
        if (!linkText.startsWith("@")) {
          authorDisplayName = linkText;
        }
      }
    }
    if (tweetUrl == null) {
      // Element was not actually a tweet. Twitter DOM is ugly.
      return null;
    }
    ensure(authorName != null, "Missing author name");
    ensure(authorDisplayName != null, "Missing author display name");

    if (likesStr == null) {
      const likesElem = (tweet.querySelector(`div[data-testid="like"]`) ||
        tweet.querySelector(`div[data-testid="unlike"]`)) as HTMLDivElement;
      likesStr = likesElem.innerText.split(" ")[0].trim();
    }
    ensure(likesStr != null, "Missing likes");

    const timeElem = tweet.querySelector("time") as HTMLTimeElement;
    const date = timeElem.dateTime;
    ensure(date != null, "Missing date");

    const isReply = tweet.textContent!.includes("Replying to");

    return {
      type: "tweet",
      url: tweetUrl,
      text: tweetText,
      date,
      authorName,
      authorDisplayName,
      likesStr,
      isReply,
    };
  } catch (e) {
    console.error(`Error extracting tweet: ${tweetText}`, tweet);
    throw e;
  }
}

function sendRequest(req: MessageReq) {
  browser.runtime.sendMessage(req);
}
