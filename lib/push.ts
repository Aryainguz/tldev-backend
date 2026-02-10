import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

const expo = new Expo();

const NOTIFICATION_EMOJIS = [
  "🔥",
  "💡",
  "🚀",
  "⚡",
  "🎯",
  "💎",
  "✨",
  "🔮",
] as const;

export interface PushNotificationPayload {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
  badge?: number;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  categoryId?: string;
}

function buildPushMessage(payload: PushNotificationPayload): ExpoPushMessage {
  const message: ExpoPushMessage = {
    to: payload.pushToken,
    title: payload.title,
    body: payload.body,
    data: {
      ...payload.data,
      ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
    },
    sound: payload.sound ?? "default",
    priority: payload.priority ?? "high",
    badge: payload.badge,
    categoryId: payload.categoryId,
  };

  if (payload.imageUrl) {
    message.richContent = { image: payload.imageUrl };
    message.mutableContent = true;
  }

  return message;
}

function getRandomEmoji(): string {
  return NOTIFICATION_EMOJIS[
    Math.floor(Math.random() * NOTIFICATION_EMOJIS.length)
  ];
}

export async function sendPushNotification(
  payload: PushNotificationPayload,
): Promise<ExpoPushTicket | null> {
  if (!Expo.isExpoPushToken(payload.pushToken)) {
    console.error(`Invalid Expo push token: ${payload.pushToken}`);
    return null;
  }

  try {
    const message = buildPushMessage(payload);
    const tickets = await expo.sendPushNotificationsAsync([message]);
    return tickets[0];
  } catch (error) {
    console.error("Error sending push notification:", error);
    return null;
  }
}

export async function sendBulkPushNotifications(
  payloads: PushNotificationPayload[],
): Promise<ExpoPushTicket[]> {
  const messages = payloads
    .filter((p) => Expo.isExpoPushToken(p.pushToken))
    .map(buildPushMessage);

  if (messages.length === 0) {
    return [];
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Error sending push notification chunk:", error);
    }
  }

  return tickets;
}

export function formatTipNotification(tip: {
  tipSummary: string | null;
  tipText: string;
  category: string;
  image?: { url: string } | null;
}): { title: string; body: string; imageUrl?: string } {
  const title = `${getRandomEmoji()} ${tip.tipText}`;
  const body = tip.tipSummary || `${tip.tipText.substring(0, 100)}...`;

  return {
    title,
    body,
    imageUrl: tip.image?.url,
  };
}
