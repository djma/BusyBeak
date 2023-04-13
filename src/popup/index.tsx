import { Reflection } from "@prisma/client";
import { Item, ResultVec } from "common/messages";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { browser } from "webextension-polyfill-ts";
import "./index.css";

type TweetVec = ResultVec<Item>;

const root = document.querySelector("#root")!;
createRoot(root).render(<App />);

function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = event.currentTarget;
  const query = (form.elements["query" as any] as any).value; // wtf typescript?
  browser.runtime.sendMessage({ type: "popup-search", query });
}

function convertToLinesWithBreaks(text: string) {
  return text
    .split("\n")
    .flatMap((line, index) => [index > 0 ? <br key={index} /> : null, line]);
}

function App() {
  const [tweets, setTweets] = useState<TweetVec[]>([]);
  const [summary, setSummary] = useState<string | null | undefined>(null);

  const channel = new BroadcastChannel("POP_UP_CHANNEL");
  channel.onmessage = (msg) => {
    if (msg.data.type === "related-tweets") {
      const decoded = msg.data as {
        type: "related-tweets";
        relatedTweets: TweetVec[];
      };

      console.log("received", decoded.relatedTweets);

      setTweets(decoded.relatedTweets);
    } else if (msg.data.type === "tweet-summary") {
      const decoded = msg.data as {
        type: "tweet-summary";
        tweetSummary: Reflection | null;
      };
      setSummary(decoded.tweetSummary?.content);
    }
  };

  // Send a message to the background script and request data
  browser.runtime.sendMessage({ type: "tweet-summary" });

  return (
    <div>
      {summary && summary.length > 0 && (
        <div>
          <h3>Today's summary</h3>
          <p>{convertToLinesWithBreaks(summary)}</p>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <label>
          <div>Search receipts:</div>
          <textarea
            name="query"
            wrap="soft"
            style={{
              marginTop: "4px",
              width: "100%",
              maxHeight: "200px",
            }}
            onInput={(e) => {
              // resize textarea
              const textarea = e.currentTarget;
              textarea.style.height = "";
              textarea.style.height = textarea.scrollHeight + "px";
            }}
          />
          <input type="submit" value="search" style={{ marginTop: "4px" }} />
        </label>
      </form>
      <RelatedTweets tweets={tweets} />
    </div>
  );
}

function RelatedTweets({ tweets }: { tweets: TweetVec[] }) {
  return (
    <div>
      {tweets.map((tweet) => (
        <div key={tweet.id}>
          <p>
            <a href={tweet.id} target="_blank">
              {tweet.metadata.type === "tweet" || tweet.metadata.type == null
                ? "@" + tweet.metadata.authorName
                : tweet.metadata.title}
            </a>
            <br />
            {tweet.metadata.type === "tweet" || tweet.metadata.type == null
              ? tweet.metadata.text
              : tweet.metadata.description}
          </p>
        </div>
      ))}
    </div>
  );
}
