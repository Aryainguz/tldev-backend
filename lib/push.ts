import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

const expo = new Expo();

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

export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<ExpoPushTicket | null> {
  if (!Expo.isExpoPushToken(payload.pushToken)) {
    console.error(`Invalid Expo push token: ${payload.pushToken}`);
    return null;
  }

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
    (message as any).richContent = {
      image: payload.imageUrl,
    };
  }

  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    return tickets[0];
  } catch (error) {
    console.error("Error sending push notification:", error);
    return null;
  }
}

export async function sendBulkPushNotifications(
  payloads: PushNotificationPayload[]
): Promise<ExpoPushTicket[]> {
  const messages: ExpoPushMessage[] = payloads
    .filter((p) => Expo.isExpoPushToken(p.pushToken))
    .map((payload) => ({
      to: payload.pushToken,
      title: payload.title,
      body: payload.body,
      data: payload.imageUrl
        ? { ...payload.data, imageUrl: payload.imageUrl }
        : payload.data,
      sound: payload.sound ?? "default",
      priority: payload.priority ?? "high",
      badge: payload.badge,
      categoryId: payload.categoryId,
    }));

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
  const clickbaitTitles = [
    `🔥 This ${tip.category} tip will change how you code`,
    `💡 ${tip.category} devs are loving this trick`,
    `🚀 Level up your ${tip.category} skills instantly`,
    `✨ The ${tip.category} hack you didn't know you needed`,
    `⚡ Quick ${tip.category} tip that saves hours`,
    `🎯 Master ${tip.category} with this one trick`,
    `💎 Hidden ${tip.category} gem most devs miss`,
    `🔮 The ${tip.category} secret pros don't share`,
  ];

  const title =
    clickbaitTitles[Math.floor(Math.random() * clickbaitTitles.length)];
  const body = tip.tipSummary || tip.tipText.substring(0, 100) + "...";

  return {
    title,
    body,
    imageUrl: tip.image?.url,
  };
}
