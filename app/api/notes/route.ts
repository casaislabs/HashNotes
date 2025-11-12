import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/utils/config";
import type { FileListItem, FileListResponse } from "pinata";

type RateEntry = { count: number; reset: number };

declare global {
  var __rate: Map<string, RateEntry> | undefined;
}

function getRateStore(): Map<string, RateEntry> {
  if (!globalThis.__rate) {
    globalThis.__rate = new Map<string, RateEntry>();
  }
  return globalThis.__rate as Map<string, RateEntry>;
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.PINATA_JWT || !process.env.NEXT_PUBLIC_GATEWAY_URL) {
      return NextResponse.json({ error: "Pinata config missing" }, { status: 500 });
    }
    const ipHeader = request.headers.get("x-forwarded-for") || "";
    const ip = ipHeader.split(",")[0].trim() || "unknown";
    const now = Date.now();
    const key = `rl:${ip}`;
    const windowMs = 60_000;
    const max = 10;
    const store = getRateStore();
    const cur = store.get(key) || { count: 0, reset: now + windowMs };
    if (cur.reset < now) {
      cur.count = 0;
      cur.reset = now + windowMs;
    }
    cur.count += 1;
    store.set(key, cur);
    if (cur.count > max) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil((cur.reset - now) / 1000)) } });
    }
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }
    const allowed = ["text/plain", "application/json"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }
    const { cid } = await pinata.upload.public
      .file(file)
      .name(`hashnotes-note-${Date.now()}`)
      .keyvalues({ app: "hashnotes" });
    const url = await pinata.gateways.public.convert(cid);
    return NextResponse.json({ cid, url }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.PINATA_JWT || !process.env.NEXT_PUBLIC_GATEWAY_URL) {
      return NextResponse.json({ error: "Pinata config missing" }, { status: 500 });
    }
    const ipHeader = request.headers.get("x-forwarded-for") || "";
    const ip = ipHeader.split(",")[0].trim() || "unknown";
    const now = Date.now();
    const key = `rl:${ip}:get`;
    const windowMs = 60_000;
    const max = 20;
    const store = getRateStore();
    const cur = store.get(key) || { count: 0, reset: now + windowMs };
    if (cur.reset < now) {
      cur.count = 0;
      cur.reset = now + windowMs;
    }
    cur.count += 1;
    store.set(key, cur);
    if (cur.count > max) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil((cur.reset - now) / 1000)) } });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
    const includeText = searchParams.get("includeText") === "true";
    const pageToken = searchParams.get("pageToken") || undefined;
    const appOnly = searchParams.get("appOnly") !== "false";

    let query = pinata.files.public
      .list()
      .order("DESC")
      .limit(limit);
    if (appOnly) {
      query = query.keyvalues({ app: "hashnotes" });
    }
    if (pageToken) {
      query = query.pageToken(pageToken);
    }
    const list: FileListResponse = await query.then((res: FileListResponse) => res);

    const files = list.files as FileListItem[];
    const items = await Promise.all(
      files
        .filter((f: FileListItem) => ["text/plain", "application/json"].includes(f.mime_type))
        .map(async (f: FileListItem) => {
          const url = await pinata.gateways.public.convert(f.cid as string);
          let text: string | undefined;
          if (includeText) {
            try {
              const resp = await pinata.gateways.public.get(f.cid as string);
              const data: unknown = resp.data;
              if (typeof data === "string") text = data;
              else if (data && typeof data === "object") text = JSON.stringify(data);
            } catch {
              text = undefined;
            }
          }
          return { cid: f.cid as string, url, createdAt: f.created_at, text };
        })
    );

    return NextResponse.json({ items, nextPageToken: list.next_page_token }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}