import { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/admin-session";

const COOKIE = "futai_admin_auth";

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const auth = req.cookies.get(COOKIE);
  return verifySessionToken(auth?.value, secret);
}
