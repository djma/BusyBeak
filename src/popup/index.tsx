import { TweetVec } from "common/messages";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { browser } from "webextension-polyfill-ts";
import "./index.css";

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
          Search:
          <input type="text" name="query" />
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
            <a href={tweet.metadata.url}>{tweet.metadata.authorDisplayName}</a>
          </p>
          <p>{tweet.metadata.text}</p>
        </div>
      ))}
    </div>
  );
}
