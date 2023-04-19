import * as dotenv from "dotenv";
import path from "path";
import { chromium, Page } from "playwright";

dotenv.config({
  path: path.join(__dirname, "..", "..", ".env"),
});

async function loginToDiscord(page: Page) {
  await page.goto("https://discord.com/login");
  // check if we're already logged in after redirect
  await page.waitForLoadState("networkidle"); // Wait for the page to stop loading
  if (page.url() === "https://discord.com/channels/@me") {
    return;
  }

  await page
    .getByLabel("Email or Phone Number*")
    .fill(process.env.DISCORD_EMAIL!);
  await page.getByLabel("Password*").fill(process.env.DISCORD_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForURL("https://discord.com/channels/@me");
}

async function goToCommunity(page: Page, communityName: string) {
  await page.getByRole("treeitem", { name: communityName }).click();
}

async function goToChannelAndScrollUp(page: Page, channelName: string) {
  await page
    .getByRole("link", { name: `${channelName} (text channel)` })
    .click();
  await page
    .getByRole("link", { name: `${channelName} (text channel)` })
    .press("End");

  await new Promise((resolve) => setTimeout(resolve, 1000));
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("link", { name: `${channelName} (text channel)` })
      //   .getByRole("list", { name: `Messages in ${channelName}` })
      .press("PageUp");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function repeatIndefinitely<T>(fn: () => Promise<T>, delayMs: number) {
  while (true) {
    await fn();
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

(async () => {
  const pathToExtension = path.join(__dirname, "../..");
  const userDataDir = "/tmp/chromium-user-data-dir";

  // clear user data dir
  //   await fs.rm(userDataDir, { recursive: true });

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: null,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });
  const page = await browser.newPage();
  await loginToDiscord(page);
  await goToCommunity(page, process.env.DISCORD_COMMUNITY!);
  repeatIndefinitely(async () => {
    const channels = process.env.DISCORD_CHANNELS!.split(",");
    for (const channel of channels) {
      await goToChannelAndScrollUp(page, channel);
    }
  }, 1000 * 60 * 5);
  await new Promise(() => {});
})();
