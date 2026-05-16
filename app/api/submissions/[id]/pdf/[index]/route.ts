import { downloadQuotePdf, getQuotePdfPath } from "@/lib/db/submissions";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; index: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "MISSING_SUPABASE_CONFIG" }, { status: 500 });
  }

  const { id, index: indexStr } = await context.params;
  const index = Number.parseInt(indexStr, 10);

  if (!Number.isInteger(index) || index < 0 || index > 2) {
    return Response.json({ error: "INVALID_INDEX" }, { status: 400 });
  }

  try {
    const path = await getQuotePdfPath(id, index);
    if (!path) {
      return Response.json({ error: "PDF_NOT_FOUND" }, { status: 404 });
    }

    const { data } = await downloadQuotePdf(path);
    const arrayBuffer = await data.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="quote.pdf"',
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load PDF";
    return Response.json({ error: "PDF_FAILED", message }, { status: 500 });
  }
}
