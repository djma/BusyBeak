console.log("Hello from content script!");

// debounce with lifecycle of page refresh
const seenTweets = new Set();

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    handleMutation(mutation);
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true,
});

function handleMutation(mutation: MutationRecord) {
  if (mutation.addedNodes.length > 0) {
    mutation.addedNodes.forEach((node) => {
      const tweets =
        node.ownerDocument?.querySelectorAll('[data-testid="tweet"]') || [];

      for (const tweet of tweets) {
        const tweetLinks = tweet.querySelectorAll(`a[role="link"]`);
        for (const link of tweetLinks) {
          const href = link?.getAttribute("href");

          // matches "/<username>/status/<tweetId>"
          const tweetUrl = href?.match(/\/\w+\/status\/\d+$/) ? href : null;

          if (tweetUrl == null || seenTweets.has(tweetUrl)) {
            continue;
          }

          // console.log(
          //   "isReply: ",
          //   tweet.textContent?.includes("Replying to") // hack
          // );
          console.log("Tweet url: ", tweetUrl);
          console.log(
            "Tweet text: ",
            tweet.querySelector('[data-testid="tweetText')?.textContent
          );

          seenTweets.add(tweetUrl);
        }
      }
    });
  }
}
