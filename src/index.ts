import { App, LogLevel } from '@slack/bolt';
import { parseVote } from './utils/vote';
import {
  recordMessageIfNewByKey,
  getTopThings,
  getTopUsers,
  getUserScore,
  recordVote,
  updateThingScore,
  updateUserScore,
} from './storage/database';
import { waitForDatabase } from './db';
import { getPool } from './storage/pool';
import migrate from './scripts/migrate';
import logger from './logger';
import { validateEnv } from './env';
import { createAbuseController } from './security/abuse-controls';
import { resolveMessageDedupeKey } from './utils/dedupe';
import { getMaintenanceConfig, runMaintenance, scheduleMaintenance } from './storage/maintenance';

function getLogLevel(): LogLevel {
  const { logLevel } = validateEnv({ requireSlack: false });
  switch (logLevel) {
    case 'error':
      return LogLevel.ERROR;
    case 'warn':
      return LogLevel.WARN;
    case 'info':
      return LogLevel.INFO;
    case 'debug':
      return LogLevel.DEBUG;
    default:
      return LogLevel.INFO;
  }
}

export function createApp() {
  validateEnv({ requireSlack: true });
  const abuseController = createAbuseController();
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    logLevel: getLogLevel(),
  });

  // Message handler
  app.message(async ({ message, say, body }) => {
    try {
      if ((message as any).subtype === 'bot_message' || (message as any).bot_id) return;
      if (!('text' in message) || !('user' in message)) return;
      const text = (message as any).text || '';
      const votes = parseVote(text);
      if (votes.length === 0) return;
      const channelId = (message as any).channel as string | undefined;
      const messageTs = (message as any).ts as string | undefined;
      const voterId = (message as any).user as string;
      const eventId =
        typeof (body as any)?.event_id === 'string' ? (body as any).event_id : undefined;

      const dedupeKey = resolveMessageDedupeKey({ eventId, channelId, messageTs });
      if (!dedupeKey) {
        logger.warn('Skipping vote processing due to missing dedupe metadata', {
          voterId,
          channelId: channelId ?? null,
          messageTs: messageTs ?? null,
          eventId: eventId ?? null,
        });
        await say('Unable to process this vote because event metadata was incomplete.');
        return;
      }

      const isNewMessage = await recordMessageIfNewByKey(dedupeKey, { channelId, messageTs });
      if (!isNewMessage) {
        logger.info('Skipping duplicate message event', {
          dedupeKey,
          channelId: channelId ?? null,
          messageTs: messageTs ?? null,
          eventId: eventId ?? null,
        });
        return;
      }

      const uniqueTargetsInMessage = new Set(
        votes.map((vote) => `${vote.targetType}:${vote.targetId}`)
      ).size;
      const messageDecision = abuseController.evaluateMessage({
        voterId,
        channelId,
        targetsInMessage: uniqueTargetsInMessage,
      });
      if (messageDecision.wouldBlock) {
        logger.warn('Abuse control triggered at message level', {
          reasonCode: messageDecision.reasonCode,
          enforcementMode: abuseController.getConfig().enforcementMode,
          voterId,
          channelId: channelId ?? null,
          details: messageDecision.details,
        });
      }
      if (!messageDecision.allowed) {
        await say(messageDecision.reasonMessage || 'Vote rejected by abuse controls.');
        return;
      }

      const seenTargets = new Set<string>();
      const results: string[] = [];
      let blockedWarning: string | null = null;
      for (const vote of votes) {
        const targetKey = `${vote.targetType}:${vote.targetId}`;
        if (seenTargets.has(targetKey)) {
          logger.info('Skipping duplicate target vote in message', { target: targetKey });
          continue;
        }
        seenTargets.add(targetKey);

        if (vote.targetType === 'user' && vote.targetId === voterId) {
          results.push(`<@${vote.targetId}> cannot vote for themselves!`);
          continue;
        }

        const voteContext = {
          voterId,
          channelId,
          targetId: vote.targetId,
          targetType: vote.targetType,
          action: vote.action,
        };
        const voteDecision = abuseController.reserveVote(voteContext);
        if (voteDecision.wouldBlock) {
          logger.warn('Abuse control triggered at vote level', {
            reasonCode: voteDecision.reasonCode,
            enforcementMode: abuseController.getConfig().enforcementMode,
            voterId,
            channelId: channelId ?? null,
            targetId: vote.targetId,
            targetType: vote.targetType,
            action: vote.action,
            details: voteDecision.details,
          });
        }
        if (!voteDecision.allowed) {
          blockedWarning =
            blockedWarning || voteDecision.reasonMessage || 'Some votes were blocked.';
          continue;
        }
        const reservation = voteDecision.reservation;

        const delta = vote.action === '++' ? 1 : -1;
        try {
          if (vote.targetType === 'user') {
            const recorded = await recordVote(voterId, vote.targetId, vote.action, {
              channelId,
              messageTs,
            });
            if (!recorded) {
              if (reservation) {
                abuseController.releaseReservedVote(reservation);
              }
              logger.info('Skipping duplicate vote record', {
                voterId: (message as any).user,
                targetId: vote.targetId,
                channelId,
                messageTs,
              });
              continue;
            }
            const newScore = await updateUserScore(vote.targetId, delta);
            const actionWord = vote.action === '++' ? 'increased' : 'decreased';
            results.push(`<@${vote.targetId}>'s score ${actionWord} to ${newScore}`);
            continue;
          }

          const newScore = await updateThingScore(vote.targetId, delta);
          const actionWord = vote.action === '++' ? 'increased' : 'decreased';
          results.push(`Score for *${vote.targetId}* ${actionWord} to ${newScore}`);
        } catch (voteError) {
          if (reservation) {
            abuseController.releaseReservedVote(reservation);
          }
          throw voteError;
        }
      }
      if (results.length && blockedWarning) {
        await say(`${results.join('\n')}\n${blockedWarning}`);
        return;
      }
      if (results.length) {
        await say(results.join('\n'));
        return;
      }
      if (blockedWarning) {
        await say(blockedWarning);
      }
    } catch (err) {
      logger.error('Error processing message event:', err);
      try {
        await say('Sorry, something went wrong processing your vote. Please try again later.');
      } catch (sayErr) {
        logger.error('Failed to send error message:', sayErr);
      }
    }
  });

  // /leaderboard command
  app.command('/leaderboard', async ({ ack, say }) => {
    await ack();
    try {
      const [userEntries, thingEntries] = await Promise.all([getTopUsers(10), getTopThings(10)]);
      if (userEntries.length === 0 && thingEntries.length === 0) {
        await say('The leaderboard is empty. Start voting with @user ++, @user --, or @thing ++');
        return;
      }
      let response = '*🏆 Leaderboard 🏆*\n\n';
      if (userEntries.length > 0) {
        response += '*Users*\n';
        userEntries.forEach(({ user_id, score }, index) => {
          const medal =
            index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          response += `${medal} <@${user_id}>: ${score}\n`;
        });
      } else {
        response += '_No user votes yet._\n';
      }

      if (thingEntries.length > 0) {
        response += '\n*Things*\n';
        thingEntries.forEach(({ thing_name, score }, index) => {
          const bullet =
            index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          response += `${bullet} *${thing_name}*: ${score}\n`;
        });
      } else {
        response += '\n_No thing votes yet._\n';
      }
      await say(response);
    } catch (e) {
      logger.error('Failed to fetch leaderboard:', e);
      await say('Failed to load leaderboard.');
    }
  });

  // /help command
  app.command('/help', async ({ ack, say }) => {
    await ack();
    try {
      const response = [
        '*pp-bot help*',
        '',
        '*Voting*',
        '`@user ++` or `@user --` to update a user score',
        '`@thing ++` or `@thing --` to update a thing score',
        '',
        '*Commands*',
        '`/leaderboard` - show top users and things',
        '`/score` - show your current score',
        '`/help` - show this help message',
        '',
        'Examples: `@alice ++ great job!`, `@release -- needs more QA`',
      ].join('\n');
      await say(response);
    } catch (e) {
      logger.error('Failed to load help:', e);
      await say('Failed to load help.');
    }
  });

  // /score command
  app.command('/score', async ({ command, ack, say }) => {
    await ack();
    try {
      const score = await getUserScore(command.user_id);
      await say(`<@${command.user_id}>'s current score is ${score}`);
    } catch (e) {
      logger.error('Failed to fetch score:', e);
      await say('Failed to load your score.');
    }
  });

  return app;
}

export async function start() {
  try {
    validateEnv({ requireSlack: true });

    // Wait for the database to be ready before starting the app
    logger.info('Waiting for database connection...');
    await waitForDatabase(15, 2000); // 15 retries with 2s initial delay
    logger.info('Database is ready');

    // Run migrations to ensure tables exist (if DATABASE_URL is set)
    if (process.env.DATABASE_URL) {
      logger.info('Running database migrations...');
      const pool = getPool();
      const migrationSuccess = await migrate(pool);
      if (!migrationSuccess) {
        throw new Error('Database migration failed');
      }
      logger.info('Database migrations complete');

      const maintenanceConfig = getMaintenanceConfig();
      if (maintenanceConfig.enabled) {
        try {
          await runMaintenance(maintenanceConfig);
        } catch (maintenanceError) {
          logger.error('Initial maintenance cleanup failed:', maintenanceError);
        }
        scheduleMaintenance(maintenanceConfig);
        logger.info('Scheduled maintenance cleanup every 12 hours');
      } else {
        logger.info('Maintenance disabled by MAINTENANCE_ENABLED=false');
      }
    } else {
      logger.info('Skipping migrations - DATABASE_URL not set');
      logger.info('Skipping maintenance - DATABASE_URL not set');
    }

    const app = createApp();
    const port = process.env.PORT || process.env.RAILWAY_PORT || 3000;
    await app.start(port);
    logger.info(`⚡️ Slack bot is running on port ${port}`);
  } catch (e) {
    logger.error('Failed to start app:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}
