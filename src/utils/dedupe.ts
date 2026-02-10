export interface MessageDedupeContext {
  eventId?: string;
  channelId?: string;
  messageTs?: string;
}

export function buildLegacyMessageDedupeKey(channelId: string, messageTs: string): string {
  return `msg:${channelId}:${messageTs}`;
}

export function resolveMessageDedupeKey(context: MessageDedupeContext): string | null {
  if (context.eventId) {
    return `event:${context.eventId}`;
  }

  if (context.channelId && context.messageTs) {
    return buildLegacyMessageDedupeKey(context.channelId, context.messageTs);
  }

  return null;
}
