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
      type: "save-discord-msgs";
      items: DiscordMsg[];
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

export interface DiscordUser {
  userId: string;
  username: string;
}
export interface DiscordMsg {
  serverId: string;
  channelId: string;
  messageId: string;
  replyToMsgId?: string;
  user: DiscordUser;
  timestamp: string;
  content: string;
}

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
  replyToUrl?: string;
};

export type ItemArticle = {
  type: "article";
  url: string;
  title: string;
  description: string;
};
