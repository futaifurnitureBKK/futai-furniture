import { NextRequest } from "next/server";
import { isSessionValid } from "@/lib/admin-session";

const COOKIE = "futai_admin_auth";

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const auth = req.cookies.get(COOKIE);
  return isSessionValid(auth?.value);
}
