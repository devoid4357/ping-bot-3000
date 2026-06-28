import {DiscordRequest} from './utils.js';
import {randomBytes} from 'node:crypto';

let isHttpRequestBeingSent = false;

// forceSend makes it so that it will EVENTUALLY send, no matter what.
export async function discordRequestRateLimitRespectful(
  endpoint,
  options,
  uponRateLimit,
  uponSuccess,
  forceSend,
  shouldContinueTrying
) {
  if (!shouldContinueTrying()) {
    return;
  }

  const id = randomBytes(6).toString("hex");
  const response = await DiscordRequest(endpoint, structuredClone(options));
  // Too Many Requests/rate limited!
  if (response.status == 429) {
    const result = await response.json();
    (uponRateLimit ?? (() => { }))(true, result.retry_after);
    if (forceSend) {
      return await new Promise((resolve) => {
        setTimeout(() => {
          discordRequestRateLimitRespectful(endpoint, options, uponRateLimit, uponSuccess, false, shouldContinueTrying)
            .then(resolve);
        }, result.retry_after * 1000);
      });
    }
    return;
  } else if (!response.ok) {
    throw new Error(await response.text());
  }

  if (response.headers.get('x-ratelimit-remaining') == 0) {
    (uponRateLimit ?? (() => { }))(false, response.headers.get('x-ratelimit-reset-after'));
  }

  uponSuccess();

  return response;
}

export function periodicallyPing(channelId, user, interval, length, count, onFinish) {
  let pingCount = 0;

  const intervalId = setInterval(async () => {
    let rateLimited = false;
    await discordRequestRateLimitRespectful(`channels/${channelId}/messages`, {
      method: "POST",
      body: {
        content: `<@${user}>`
      }
    }, (erroredDueToLimit) => {
      if (erroredDueToLimit) {
        rateLimited = true;
      }
    }, () => {
      pingCount += 1;

      if (count != null && pingCount >= count) {
        clearInterval(intervalId);
        onFinish();
      }
    }, true, () => {
      if (count != null && pingCount >= count) {
        clearInterval(intervalId);
        onFinish();
        return false;
      }

      return true;
    });
  }, interval);

  if (length != null && length != undefined) {
    setTimeout(() => {
      clearInterval(intervalId);
      onFinish();
    }, length);
  }

  return intervalId;
}