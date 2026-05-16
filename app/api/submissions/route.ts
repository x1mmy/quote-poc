import { listSubmissions } from "@/lib/db/submissions";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { SubmissionsListResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ submissions: [] } satisfies SubmissionsListResponse);
  }

  try {
    const submissions = await listSubmissions();
    return Response.json({ submissions } satisfies SubmissionsListResponse);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load submissions";
    return Response.json({ error: "DATABASE_FAILED", message }, { status: 500 });
  }
}
