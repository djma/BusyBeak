/** Request from tab to background process. */
export type MessageReq =
  | {
      type: "save";
      tweetUrl: string;
      tweetMeta: TweetMeta;
    }
  | {
      type: "search-related";
      tweetUrl: string;
      tweetMeta: TweetMeta;
    }
  | {
      type: "popup-search";
      query: string;
    };

/** Response from background process to tab. */
export type MessageRes = {
  type: "related-tweets";
  tweetUrl: string;
  relatedTweets: TweetVec[];
};

/** A single tweet result, optionally with the embedding vector. */
export type TweetVec = {
  id: string;
  score: number;
  metadata: TweetMeta;
  values?: number[];
};

/** Tweet metadata. URL not included, used as the ID. */
export type TweetMeta = {
  url: string;
  text: string;
  date: string;
  authorName: string;
  authorDisplayName: string;
  likesStr: string;
  isReply: boolean;
};

export async function sha1hex(str: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashHex = await crypto.subtle.digest("SHA-1", data).then((hash) => {
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  });
  return hashHex;
}
