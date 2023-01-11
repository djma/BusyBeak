import { ItemTweet, ResultVec } from "common/messages";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { browser } from "webextension-polyfill-ts";
import "./index.css";

type TweetVec = ResultVec<ItemTweet>;

const root = document.querySelector("#root")!;
createRoot(root).render(<App />);

function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = event.currentTarget;
  const query = (form.elements["query" as any] as any).value; // wtf typescript?
  browser.runtime.sendMessage({ type: "popup-search", query });
}

function App() {
  const [tweets, setTweets] = useState<TweetVec[]>([]);

  const channel = new BroadcastChannel("POP_UP_CHANNEL");
  channel.onmessage = (msg) => {
    const decoded = msg.data as {
      type: "related-tweets";
      relatedTweets: TweetVec[];
    };

    console.log("received", decoded.relatedTweets);

    setTweets(decoded.relatedTweets);
  };

  return (
    <div>
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
              @{tweet.metadata.authorName}
            </a>
            <br />
            {tweet.metadata.text}
          </p>
        </div>
      ))}
    </div>
  );
}
