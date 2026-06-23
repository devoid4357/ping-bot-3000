import 'dotenv/config';
import {InstallGlobalCommands} from './utils.js';

// Command containing options
const SPAMPING_COMMAND = {
  name: 'spamping',
  description: 'Spam pings someone. Might wanna give a heads-up.',
  options: [
    {
      type: 6,
      name: 'user',
      description: 'Who should be pinged, anyways?',
      required: true,
    },
    {
      type: 4,
      name: 'interval',
      description: 'What\'s the interval...? (how much to wait in-between pings, milliseconds)',
      required: true,
      min_value: 500,
    },
    {
      type: 4,
      name: 'length',
      description: 'For how long, in milliseconds?',
      required: false,
      min_value: 500,
    },
    {
      type: 4,
      name: 'count',
      description: 'How many times shall I ping?',
      required: false,
    },
    {
      type: 5,
      name: 'dm_logs',
      description: 'Should I DM logs to you?',
      required: false,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const STOPSPAM_COMMAND = {
  name: 'stopspam',
  description: 'Stops your spam. You must have started the target spam in the first place.',
  options: [
    {
      type: 4,
      name: 'spam_id',
      description: 'What\'s the spam id?',
      required: true,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const ALL_COMMANDS = [SPAMPING_COMMAND, STOPSPAM_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
