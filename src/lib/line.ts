import "server-only";

export async function notifyAdminLine(text: string): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId = process.env.LINE_ADMIN_USER_ID;
  if (!accessToken || !userId) return;

  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text }],
      }),
    });
  } catch {
    // Notification failure should never block the order/quote from being saved.
  }
}
