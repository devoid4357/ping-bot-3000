import {DiscordRequest} from './utils.js';

export function periodicallyPing(channelId, user, interval, length, count, onFinish) {
  let pingCount = 0;
  let isPaused = false;

  const intervalId = setInterval(async () => {
    if (isPaused) {
      return;
    }

    pingCount += 1;
    const response = await DiscordRequest(`channels/${channelId}/messages`, {
      method: "POST",
      body: {
        content: `<@${user}>`
      }
    });
    if (response.headers.get('x-ratelimit-remaining') == 0) {
      isPaused = true;
      setTimeout(() => {
        isPaused = false;
      }, response.headers.get('x-ratelimit-reset-after') * 1000);
    }

    if (count != null && pingCount >= count) {
      clearInterval(intervalId);
      onFinish();
    }
  }, interval);

  if (length != null && length != undefined) {
    setTimeout(() => {
      clearInterval(intervalId);
      onFinish();
    }, length);
  }

  return intervalId;
}