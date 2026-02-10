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
  payload: PushNotificationPayload,
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

  // Rich image notification using Expo's official richContent API
  if (payload.imageUrl) {
    // richContent.image: Expo Push API forwards this to FCM (Android BigPictureStyle)
    // and APNs (iOS - requires Notification Service Extension to download & attach)
    message.richContent = { image: payload.imageUrl };
    // mutableContent: tells iOS to invoke the Notification Service Extension
    message.mutableContent = true;
    // Also keep in data for in-app handling
    message.data = { ...message.data, imageUrl: payload.imageUrl };
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
  payloads: PushNotificationPayload[],
): Promise<ExpoPushTicket[]> {
  const messages: ExpoPushMessage[] = payloads
    .filter((p) => Expo.isExpoPushToken(p.pushToken))
    .map((payload) => {
      const msg: any = {
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
      };

      // Rich image notification using Expo's official richContent API
      if (payload.imageUrl) {
        msg.richContent = { image: payload.imageUrl }; // Android BigPicture + iOS attachment
        msg.mutableContent = true; // iOS: triggers Notification Service Extension
      }

      return msg;
    });

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
  // Use the AI-generated headline directly as the notification title
  // tipText contains dynamic headlines like "How Atlassian Saves Millions with Protobuf"
  const emojis = ["🔥", "💡", "🚀", "⚡", "🎯", "💎", "✨", "🔮"];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const title = `${emoji} ${tip.tipText}`;

  // Use AI-generated summary as the notification body
  const body = tip.tipSummary || tip.tipText.substring(0, 100) + "...";

  return {
    title,
    body,
    imageUrl: tip.image?.url,
  };
}
