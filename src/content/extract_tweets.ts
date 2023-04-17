import { ensure } from "../common/assert";
import { ItemTweet, messageBackground } from "../common/messages";
import { normalizeTweetUrl } from "../common/validate";

const savedTweetIds = new Set<string>();
let nextSaveId = 0;
const tweetsToSave = [] as ItemTweet[];

/** Extracts tweets from the timeline DOM. At most once every few seconds, sends
 * a batch of them to the background process to embed and save. */
export function extractTweets(url: string) {
  /** Is the browser focused on a particular tweet */
  const isTweetFocus = url.match(/twitter\.com\/\w+\/status\/\d+$/);

  const cellInnerDivs =
    document.querySelectorAll('div[data-testid="cellInnerDiv"]') || [];

  let isNextTweetReply = false;
  const tweets = [];
  for (const elem of cellInnerDivs) {
    if ((elem as HTMLAnchorElement).innerText === "Show replies") {
      isNextTweetReply = false;
      continue;
    } else if ((elem as HTMLAnchorElement).innerText === "Show this thread") {
      isNextTweetReply = false;
    }

    const tweetElem = elem.querySelector('article[data-testid="tweet"]');

    if (tweetElem == null) continue;
    const tweet = tryExtractTweet(tweetElem);
    if (tweet == null) continue;

    // add a replyToID
    if (isNextTweetReply) {
      tweet.replyToUrl = tweets[tweets.length - 1].url;
      isNextTweetReply = false;
    } else if (isTweetFocus && tweets.length > 0) {
      tweet.replyToUrl = tweets[0].url;
    }

    tweets.push(tweet);

    // if this tweet contains a div with offsetWidth == 2, the next tweet is a reply
    const tweetDivs = tweetElem.querySelectorAll("div");
    for (const div of tweetDivs) {
      if (div.offsetWidth === 2) {
        isNextTweetReply = true;
        break;
      }
    }

    // Skip if we've already saved this tweet
    if (tweet.url == null || savedTweetIds.has(tweet.url)) continue;
    savedTweetIds.add(tweet.url);

    // Skip empty
    if (tweet.text == null || tweet.text === "") continue;

    // Skip short tweets
    if (tweet.text.length < 20) {
      console.log("Skipping short tweet: ", tweet.text);
      continue;
    }

    // Skip replies
    // if (tweet.isReply) {
    //   console.log("Skipping reply: ", tweet.text);
    //   continue;
    // }

    console.log(`Queuing to save: ${tweet.url}`);
    tweetsToSave.push(tweet);
  }
  if (tweetsToSave.length === 0) return;
  if (nextSaveId > 0) return;

  nextSaveId = window.setTimeout(() => {
    console.log(`Saving ${tweetsToSave.length} tweets`);
    messageBackground({ type: "tweet", items: tweetsToSave.slice() });
    nextSaveId = 0;
    tweetsToSave.length = 0;
  }, 5000);
}

export function removeAds() {
  const adElems = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
  for (const elem of adElems) {
    const arrowSvg =
      '<g><path d="M19.498 3h-15c-1.381 0-2.5 1.12-2.5 2.5v13c0 1.38 1.119 2.5 2.5 2.5h15c1.381 0 2.5-1.12 2.5-2.5v-13c0-1.38-1.119-2.5-2.5-2.5zm-3.502 12h-2v-3.59l-5.293 5.3-1.414-1.42L12.581 10H8.996V8h7v7z"></path></g>';
    if (
      [...elem.querySelectorAll("svg")].some(
        (svg) => svg.innerHTML === arrowSvg
      ) &&
      [...elem.querySelectorAll("div")].some(
        (div) => div.innerText?.indexOf("Promoted") > -1
      )
    ) {
      // If you try to remove the whole div, twitter will say "something went wrong".
      elem
        .querySelectorAll('div[data-testid="placementTracking"]')
        ?.forEach((div) => div.remove());
    }
  }
}

export function tryExtractTweet(tweet: Element): ItemTweet | null {
  const authorDisplayName =
    tweet.querySelector(`div[data-testid="User-Name"]`)?.children.item(0)
      ?.textContent || "";
  const authorName =
    (tweet
      .querySelector(`div[data-testid="User-Name"]`)
      ?.children.item(1)
      ?.textContent?.split("·")[0]
      .trim()
      .slice(1) as string) || "";
  const tweetText =
    tweet.querySelector('[data-testid="tweetText"]')?.textContent || "";
  try {
    let tweetUrl, likesStr;
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
        // authorName = href.split("/").slice(-1)[0];
        const linkText = (link as HTMLAnchorElement).innerText.trim();
        if (!linkText.startsWith("@")) {
          // authorDisplayName = linkText;
        }
      }
    }
    if (tweetUrl == null) {
      console.log("Missing tweet URL", tweet);
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
