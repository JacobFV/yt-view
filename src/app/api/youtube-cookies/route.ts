import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { requireUser } from "../../../server/auth";
import {
  deleteYouTubeCookieExport,
  getYouTubeCookieStatus,
  saveYouTubeCookieExport
} from "../../../server/youtube-cookies";

export const runtime = "nodejs";

const jsonSchema = z.object({
  cookies: z.string().min(1)
});

async function cookieTextFromRequest(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const value = form.get("cookies");
    if (typeof value === "string") return value;
    if (value instanceof File) return value.text();
    throw new Error("Attach a cookies.txt file.");
  }
  return jsonSchema.parse(await request.json()).cookies;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ youtubeCookies: await getYouTubeCookieStatus(user) });
  } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const cookies = await cookieTextFromRequest(request);
    return NextResponse.json({ youtubeCookies: await saveYouTubeCookieExport(user, cookies) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save YouTube cookies." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    await deleteYouTubeCookieExport(user);
    return NextResponse.json({
      youtubeCookies: { configured: false, cookieCount: 0, updatedAt: null }
    });
  } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
}
