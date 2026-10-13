import "server-only";

// LINE_ADMIN_USER_ID supports more than one recipient — set it to a
// comma-separated list (e.g. "Uaaa...,Ubbb...") to notify several people.
// Adding/removing a recipient is then just an env var edit, no deploy
// needed beyond that.
export async function notifyAdminLine(text: string): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userIdsRaw = process.env.LINE_ADMIN_USER_ID;
  if (!accessToken || !userIdsRaw) {
    console.error("notifyAdminLine: missing LINE_CHANNEL_ACCESS_TOKEN or LINE_ADMIN_USER_ID env var");
    return;
  }
  const userIds = userIdsRaw.split(",").map((id) => id.trim()).filter(Boolean);

  await Promise.all(
    userIds.map(async (userId) => {
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
        // Notification failure should never block the order/quote from
        // being saved — but a silent failure here was undebuggable, so at
        // least log the real reason (shows up in Vercel's function logs).
        if (!res.ok) {
          console.error("notifyAdminLine: LINE push failed", userId, res.status, await res.text());
        }
      } catch (err) {
        console.error("notifyAdminLine: fetch threw", userId, err);
      }
    })
  );
}
