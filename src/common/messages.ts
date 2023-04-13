import { ArticleData } from "@extractus/article-extractor";
import { browser } from "webextension-polyfill-ts";

export function messageBackground(req: MessageReq) {
  browser.runtime.sendMessage(req);
}

export function messageTab(tabId: number, message: MessageRes) {
  browser.tabs.sendMessage(tabId, message);
}

/** Request from tab to background process. */
export type MessageReq =
  | {
      type: "tweet";
      items: ItemTweet[];
    }
  | {
      type: "search-related";
      tweet: ItemTweet;
    }
  | {
      type: "popup-search";
      query: string;
    }
  | {
      type: "save-article";
      article: ArticleData;
      url: string;
    }
  | {
      type: "tweet-summary";
    };

/** Response from background process to tab. */
export type MessageRes = {
  type: "related-tweets";
  tweetUrl: string;
  relatedTweets: ResultVec<Item>[];
};

/** A single result, optionally with the embedding vector. */
export type ResultVec<T extends Item> = {
  id: string;
  score: number;
  metadata: T;
  values?: number[];
};

export type Item = ItemTweet | ItemArticle;

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

export type ItemArticle = {
  type: "article";
  url: string;
  title: string;
  description: string;
};
