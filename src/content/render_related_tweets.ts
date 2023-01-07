import { TweetVec } from "../common/messages";

export function renderRelatedTweets(tweets: TweetVec[]): HTMLDivElement {
  const header = document.createElement("h2");
  header.style.fontFamily = "TwitterChirp,system-ui,sans-serif";
  header.style.color = "rgb(231,233,234)";
  header.style.fontSize = "20px";
  header.style.fontWeight = "800";
  header.style.lineHeight = "24px";
  header.style.margin = "0";
  header.style.padding = "12px 16px";
  header.innerText = "Related tweets";

  const list = document.createElement("div");
  list.style.color = "rgb(231,233,234)";
  list.replaceChildren(...tweets.map(renderTweet));

  const ret = document.createElement("div");
  ret.replaceChildren(header, list);
  return ret;
}

export function renderTweet(tweet: TweetVec): HTMLElement {
  const slug = document.createElement("div");
  slug.style.fontFamily = "TwitterChirp,system-ui,sans-serif";
  slug.style.fontWeight = "400";
  slug.style.fontSize = "15px";
  slug.style.color = "rgb(113, 118, 123)";
  slug.style.fontVariantNumeric = "tabular-nums";

  const meta = tweet.metadata;
  const score = tweet.score.toFixed(3);
  slug.innerText = `${score} @${meta.authorName} ${meta.likesStr}`;

  const snippet = document.createElement("div");
  snippet.style.color = "rgb(231,233,234)";
  snippet.style.fontFamily = "TwitterChirp,system-ui,sans-serif";
  snippet.style.fontSize = "15px";
  snippet.style.fontWeight = "400";
  let snip = meta.text
    .split("\n")
    .map((s) => s.trim())
    .join(" ");
  if (snip.length > 100) {
    snip = snip.substring(0, 100) + "…";
  }
  snippet.innerText = snip;

  const a = document.createElement("a");
  a.href = tweet.id;
  a.target = "_blank";
  a.style.textDecoration = "none";
  a.style.display = "block";
  a.style.margin = "12px 16px";
  a.replaceChildren(slug, snippet);
  return a;
}
