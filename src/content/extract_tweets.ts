import { browser } from "webextension-polyfill-ts";
import { ensure } from "../common/assert";
import { MessageReq, TweetMeta } from "../common/messages";
import { normalizeTweetUrl } from "../common/validate";

const savedTweetIds = new Set<string>();

export function extractAndSaveTweets() {
  const tweets =
    document.querySelectorAll('article[data-testid="tweet"]') || [];

  for (const tweet of tweets) {
    const extracted = tryExtractTweet(tweet);
    if (extracted == null) continue;
    const { tweetUrl, tweetMeta } = extracted;

    // Skip if we've already saved this tweet
    if (tweetUrl == null || savedTweetIds.has(tweetUrl)) continue;
    savedTweetIds.add(tweetUrl);

    // Skip empty
    if (tweetMeta.text == null || tweetMeta.text === "") continue;

    console.log(`Saving tweet ${tweetUrl}`);
    sendRequest({ type: "save", tweetUrl, tweetMeta });
  }
}

export function tryExtractTweet(tweet: Element): {
  tweetUrl: string;
  tweetMeta: TweetMeta;
} | null {
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

    const tweetMeta: TweetMeta = {
      text: tweetText,
      date,
      authorName,
      authorDisplayName,
      likesStr,
      isReply,
    };

    return { tweetUrl, tweetMeta };
  } catch (e) {
    console.error(`Error extracting tweet: ${tweetText}`, tweet);
    throw e;
  }
}

function sendRequest(req: MessageReq) {
  browser.runtime.sendMessage(req);
}
