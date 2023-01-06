import React from "react";
import { createRoot } from "react-dom/client";
import { browser } from "webextension-polyfill-ts";

const root = document.querySelector("#root")!;
createRoot(root).render(<App />);

function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = event.currentTarget;
  const query = (form.elements["query" as any] as any).value; // wtf typescript?
  browser.runtime.sendMessage({ type: "popup-search", query });
}

function App() {
  return (
    <form onSubmit={handleSubmit}>
      <label>
        Search:
        <input type="text" name="query" />
      </label>
    </form>
  );
}
