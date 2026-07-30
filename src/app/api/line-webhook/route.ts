import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function isValidSignature(rawBody: string, signature: string | null, channelSecret: string) {
  if (!signature) return false;
  const hash = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelSecret || !accessToken) {
    return NextResponse.json({ error: "LINE env vars not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  if (!isValidSignature(rawBody, signature, channelSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  for (const event of body.events ?? []) {
    if (event.type === "message" && event.replyToken) {
      const userId = event.source?.userId ?? "ไม่พบ userId (อาจทักจากกลุ่มหรือ official account อื่น)";
      await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: `User ID ของคุณคือ:\n${userId}` }],
        }),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
