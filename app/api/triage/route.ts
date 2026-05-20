import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runTriage } from "@/lib/agent";
import type { TriageResponse, TriageErrorResponse } from "@/types";

const MAX_MESSAGE_LENGTH = 10_000;

const triageRequestSchema = z.object({
  message: z
    .string()
    .min(1, "message must be a non-empty string")
    .max(
      MAX_MESSAGE_LENGTH,
      `message must not exceed ${MAX_MESSAGE_LENGTH} characters`,
    ),
  meta: z
    .object({
      id: z.string().optional(),
      channel: z.string().optional(),
      sender_name: z.string().optional(),
      received_at: z.string().optional(),
    })
    .optional(),
});

export async function POST(
  req: NextRequest,
): Promise<NextResponse<TriageResponse | TriageErrorResponse>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = triageRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    const result = await runTriage(parsed.data);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
