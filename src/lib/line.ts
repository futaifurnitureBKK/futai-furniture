import "server-only";

export async function notifyAdminLine(text: string): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId = process.env.LINE_ADMIN_USER_ID;
  if (!accessToken || !userId) {
    console.error("notifyAdminLine: missing LINE_CHANNEL_ACCESS_TOKEN or LINE_ADMIN_USER_ID env var");
    return;
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
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
    // Notification failure should never block the order/quote from being
    // saved — but a silent failure here was undebuggable, so at least log
    // the real reason (shows up in Vercel's function logs) before moving on.
    if (!res.ok) {
      console.error("notifyAdminLine: LINE push failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("notifyAdminLine: fetch threw", err);
  }
}
