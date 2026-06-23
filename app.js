import 'dotenv/config';
import express from 'express';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import {DiscordRequest} from './utils.js';
import {periodicallyPing} from "./ping.js"

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

const intervalIdToUserMapping = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const {id, type, data} = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({type: InteractionResponseType.PONG});
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    if ((process.env.DISALLOWED_USERS ?? []).includes(data.user.id)) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: '# no'
            }
          ]
        },
      });
    }

    const {channel_id: channelId} = req.body;
    const {name: commandName} = data;

    // "spamping" command
    if (commandName === 'spamping') {
      let user, interval;
      let length = null;
      let count = null;

      for (const option of data.options) {
        switch (option.name) {
          case 'user': {
            user = option.value;
            break;
          }
          case 'interval': {
            interval = option.value;
            break;
          }
          case 'length': {
            length = option.value;
            break;
          }
          case 'count': {
            count = option.value;
            break;
          }
        }
      }

      if (typeof length == typeof count) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: 'Length or count must be present. They are also mutually exclusive.'
              }
            ]
          },
        });
      }

      const intervalId = periodicallyPing(channelId, user, interval, length, count, () => {
        delete intervalIdToUserMapping[user];
      });
      intervalIdToUserMapping[user] = intervalId;

      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: 'alright! here we go! (will wait for rate limits) ' +
                `[spam id: ${intervalId}]`
            }
          ]
        },
      });
    } else if (commandName == "stopspam") {
      let intervalId;

      for (const option of data.options) {
        switch (option.name) {
          case 'spam_id': {
            intervalId = option.value;
            break;
          }
        }
      }

      const initiator = intervalIdToUserMapping[user];
      if (initiator == undefined) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: 'are you sure you started this spam?'
              }
            ]
          },
        });
      } else if (initiator != intervalId) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: 'are you sure you started this spam?'
              }
            ]
          },
        });
      }

      clearInterval(intervalId);
      delete intervalIdToUserMapping[user];

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: 'stopped!'
            }
          ]
        },
      });
    }

    console.error(`unknown command: ${commandName}`);
    return res.status(400).json({error: 'unknown command'});
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({error: 'unknown interaction type'});
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
