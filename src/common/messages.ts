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

export interface ContentAddressable {
  preimage(): string;
  digest(): Promise<string>;
}

/** Tweet metadata. URL not included, used as the ID. */
export class TweetMeta implements ContentAddressable {
  url!: string;
  text!: string;
  date!: string;
  authorName!: string;
  authorDisplayName!: string;
  likesStr!: string;
  isReply!: boolean;

  // // what I really want is an easy way to create objects of this type without all the constructor boilerplate
  // // I feel like I'm missing some typescript feature knowledge
  constructor({
    url,
    text,
    date,
    authorName,
    authorDisplayName,
    likesStr,
    isReply,
  }: {
    url: string;
    text: string;
    date: string;
    authorName: string;
    authorDisplayName: string;
    likesStr: string;
    isReply: boolean;
  }) {
    this.url = url;
    this.text = text;
    this.date = date;
    this.authorName = authorName;
    this.authorDisplayName = authorDisplayName;
    this.likesStr = likesStr;
    this.isReply = isReply;
  }

  public async digest(): Promise<string> {
    return await sha1hex(this.text);
  }

  public preimage(): string {
    return this.text;
  }
}

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
