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
  text: string;
  date: string;
  authorName: string;
  authorDisplayName: string;
  likesStr: string;
  isReply: boolean;
};
