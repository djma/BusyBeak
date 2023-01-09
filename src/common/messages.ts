/** Request from tab to background process. */
export type MessageReq =
  | {
      type: "save";
      items: Item[];
    }
  | {
      type: "search-related";
      tweet: ItemTweet;
    }
  | {
      type: "popup-search";
      query: string;
    };

/** Response from background process to tab. */
export type MessageRes = {
  type: "related-tweets";
  tweetUrl: string;
  relatedTweets: ResultVec<ItemTweet>[];
};

/** A single result, optionally with the embedding vector. */
export type ResultVec<T extends Item> = {
  id: string;
  score: number;
  metadata: T;
  values?: number[];
};

export type Item = ItemTweet;

export type ItemTypeUrl = {
  type: string;
  url: string;
};

/** A single tweet */
export type ItemTweet = ItemTypeUrl & {
  type: "tweet";
  text: string;
  date: string;
  authorName: string;
  authorDisplayName: string;
  likesStr: string;
  isReply: boolean;
};
