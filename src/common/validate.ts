/** Validates the tweet URL and normalizes it to an absolute URL. */
export function normalizeTweetUrl(url: string): string {
  if (url.startsWith("/")) {
    url = "https://twitter.com" + url;
  }
  return validateTweetUrl(url);
}

/** Ensure it starts with 'https://twitter.com/' and ends with a number. */
export function validateTweetUrl(url: string): string {
  if (!/^https:\/\/twitter.com\/\w+\/status\/\d+$/.test(url)) {
    throw new Error(`Invalid tweet URL: ${url}`);
  }
  return url;
}
