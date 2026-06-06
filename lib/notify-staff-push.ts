import { sendExpoPushNotifications } from "@/lib/expo-push";
import { prisma } from "@/lib/prisma";

export type StaffPushMessage = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

/** Envía push a todos los dispositivos staff/admin de la org (fire-and-forget). */
export async function notifyOrganizationStaff(
  organizationId: string,
  message: StaffPushMessage,
  options?: { excludeEmail?: string }
): Promise<void> {
  try {
    const tokens = await prisma.mobilePushToken.findMany({
      where: {
        organizationId,
        ...(options?.excludeEmail
          ? {
              NOT: {
                email: { equals: options.excludeEmail.trim(), mode: "insensitive" },
              },
            }
          : {}),
      },
      select: { expoPushToken: true },
    });

    if (tokens.length === 0) return;

    await sendExpoPushNotifications(
      tokens.map((t) => ({
        to: t.expoPushToken,
        title: message.title,
        body: message.body,
        data: message.data,
        sound: "default",
      }))
    );
  } catch (err) {
    console.error("[notify-staff-push]", err);
  }
}

/** No bloquea la respuesta HTTP del caller. */
export function notifyOrganizationStaffAsync(
  organizationId: string,
  message: StaffPushMessage,
  options?: { excludeEmail?: string }
): void {
  void notifyOrganizationStaff(organizationId, message, options);
}
