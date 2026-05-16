import { getSubmission, patchSubmission } from "@/lib/db/submissions";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { Submission, SubmissionStatus } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "MISSING_SUPABASE_CONFIG" }, { status: 500 });
  }

  const { id } = await context.params;

  try {
    const submission = await getSubmission(id);
    if (!submission) {
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return Response.json({ submission } satisfies { submission: Submission });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load submission";
    return Response.json({ error: "DATABASE_FAILED", message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "MISSING_SUPABASE_CONFIG" }, { status: 500 });
  }

  const { id } = await context.params;

  let body: { partnerNotes?: string; status?: SubmissionStatus };
  try {
    body = (await request.json()) as { partnerNotes?: string; status?: SubmissionStatus };
  } catch {
    return Response.json({ error: "BAD_JSON" }, { status: 400 });
  }

  if (body.partnerNotes === undefined && body.status === undefined) {
    return Response.json({ error: "EMPTY_PATCH" }, { status: 400 });
  }

  try {
    const submission = await patchSubmission(id, {
      partnerNotes: body.partnerNotes,
      status: body.status,
    });
    return Response.json({ submission } satisfies { submission: Submission });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update submission";
    return Response.json({ error: "DATABASE_FAILED", message }, { status: 500 });
  }
}
