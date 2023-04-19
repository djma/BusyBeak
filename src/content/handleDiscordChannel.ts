import { DiscordMsg, DiscordUser, messageBackground } from "../common/messages";

const savedMessageIds = new Set<string>();
let nextSaveId = 0;
const msgsToSave = [] as DiscordMsg[];

export function handleDiscordChannel(lastUrl: string) {
  // parse the url to get the discord and channel ids
  const urlParts = lastUrl.split("/");
  const channelsIndex = urlParts.indexOf("channels");
  const serverId = urlParts[channelsIndex + 1];
  const channelId = urlParts[channelsIndex + 2];

  // parse all the messages
  const msgs = document.querySelectorAll("li[id*=chat-messages]");

  let currentUser = null as DiscordUser | null;
  msgs.forEach((msg) => {
    const messageId = msg.getAttribute("id")!.split("-")[3];

    const usernameEl = msg.querySelector(
      "h3[aria-labelledby*=message-username-"
    );

    if (usernameEl != null) {
      // const userId = usernameEl // that's not the user id. It's the message id.
      //   ?.querySelector("span[id*=message-username-")
      //   ?.getAttribute("id")
      //   ?.split("-")[2]!;
      const username = usernameEl?.querySelector("span[id*=message-username-")
        ?.textContent!;

      currentUser = {
        userId: username, // TODO: get the user id?
        username,
      };
    }

    const timestamp = msg.querySelector("time")?.getAttribute("datetime")!;
    const content = msg.querySelector("div[id*=message-content-")?.textContent!;

    const replyToMsgId = msg
      .querySelector("div[id*=message-reply-context-")
      ?.querySelector("div[id*=message-content-]")
      ?.getAttribute("id")
      ?.split("-")[2];

    const discordMsg: DiscordMsg = {
      serverId,
      channelId,
      messageId,
      replyToMsgId,
      user: currentUser!,
      timestamp,
      content,
    };

    if (savedMessageIds.has(messageId)) return;
    savedMessageIds.add(messageId);

    console.log(msg);
    console.log(currentUser, discordMsg);
    msgsToSave.push(discordMsg);
  });

  if (msgsToSave.length === 0) return;
  if (nextSaveId > 0) return;

  nextSaveId = window.setTimeout(() => {
    console.log(`Saving ${msgsToSave.length} msgs`);
    messageBackground({ type: "save-discord-msgs", items: msgsToSave.slice() });
    nextSaveId = 0;
    msgsToSave.length = 0;
  }, 5000);
}
