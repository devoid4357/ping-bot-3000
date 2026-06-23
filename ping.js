import {DiscordRequest} from './utils.js';

let isHttpRequestBeingSent = false;

// forceSend makes it so that it will EVENTUALLY send, no matter what.
export async function discordRequestRateLimitRespectful(
  endpoint,
  options,
  uponRateLimit,
  uponFinish,
  forceSend
) {
  const response = await DiscordRequest(endpoint, options);
  // Too Many Requests/rate limited!
  if (response.status == 429) {
    const result = await response.json();
    (uponRateLimit ?? (() => { }))(result.reset_after);
    if (forceSend) {
      return await new Promise((resolve) => {
        setTimeout(() => {
          discordRequestRateLimitRespectful(endpoint, options, uponRateLimit, false);
          resolve();
        }, result.reset_after);
      });
    }
    return;
  } else if (!response.ok) {
    const data = await response.json();
    console.log(`encountered status that is not consided "ok": ${response.status}`);
    throw new Error(JSON.stringify(data));
  }

  if (response.headers.get('x-ratelimit-remaining') == 0) {
    (uponRateLimit ?? (() => { }))(response.headers.get('x-ratelimit-reset-after'));
  }

  return response;
}

export function periodicallyPing(channelId, user, interval, length, count, onFinish) {
  let pingCount = 0;
  let isPaused = false;

  const intervalId = setInterval(async () => {
    if (isPaused) {
      return;
    }

    await discordRequestRateLimitRespectful(`channels/${channelId}/messages`, {
      method: "POST",
      body: {
        content: `<@${user}>`
      }
    }, (resetAfter) => {
      isPaused = true;
      setTimeout(() => {
        isPaused = false;
      }, resetAfter);
    }, true);

    pingCount += 1;
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