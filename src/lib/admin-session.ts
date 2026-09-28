// Server-tracked admin sessions (Supabase-backed) — replaces the old
// stateless signed-token approach so currently-active logins can be listed
// and remotely revoked ("kick") from the security page. Talks to Supabase's
// REST API directly with a raw fetch (not the supabase-js client), the same
// way proxy.ts's visitor tracking already does, so this one implementation
// works unchanged in both the Edge proxy/middleware and Node.js API routes.

function restUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;
}

function restHeaders(extra?: Record<string, string>): Record<string, string> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function createAdminSession(params: {
  ip: string;
  name: string;
  userAgent: string;
  maxAgeSeconds: number;
}): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + params.maxAgeSeconds * 1000).toISOString();
  await fetch(restUrl("admin_sessions"), {
    method: "POST",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({
      id,
      ip: params.ip,
      name: params.name,
      user_agent: params.userAgent,
      expires_at: expiresAt,
    }),
  });
  return id;
}

export async function isSessionValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(
      restUrl(`admin_sessions?id=eq.${encodeURIComponent(token)}&select=expires_at,revoked_at&limit=1`),
      { headers: restHeaders() }
    );
    if (!res.ok) return false;
    const rows = (await res.json()) as { expires_at: string; revoked_at: string | null }[];
    const row = rows[0];
    if (!row || row.revoked_at) return false;
    return new Date(row.expires_at).getTime() > Date.now();
  } catch {
    return false;
  }
}

export async function revokeAdminSession(token: string): Promise<void> {
  await fetch(restUrl(`admin_sessions?id=eq.${encodeURIComponent(token)}`), {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ revoked_at: new Date().toISOString() }),
  });
}
