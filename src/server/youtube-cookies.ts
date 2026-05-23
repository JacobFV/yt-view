import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { User } from "./auth";
import { ensureSchema, sql } from "./db";

const MAX_COOKIE_EXPORT_BYTES = 500_000;

type CookieExportRow = {
  encrypted_cookies: string;
  iv: string;
  auth_tag: string;
  cookie_count: number | string;
  updated_at: string | Date;
};

export type YouTubeCookieStatus = {
  configured: boolean;
  cookieCount: number;
  updatedAt: string | null;
};

function encryptionKey(): Buffer {
  const configured = process.env.YT2CTX_COOKIE_ENCRYPTION_KEY;
  const fallback = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const secret = configured || fallback;
  if (!secret) throw new Error("Cookie encryption key is not configured.");
  return createHash("sha256").update(secret).digest();
}

function parseCookieExport(text: string): { normalized: string; cookieCount: number } {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) throw new Error("Upload a Netscape cookies.txt export.");
  if (Buffer.byteLength(normalized, "utf8") > MAX_COOKIE_EXPORT_BYTES) {
    throw new Error("Cookie export is too large.");
  }

  const cookieLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const youtubeCookieLines = cookieLines.filter((line) => {
    const columns = line.split("\t");
    return columns.length >= 7 && /(^|\.)youtube\.com$/i.test(columns[0].replace(/^\./, ""));
  });

  if (youtubeCookieLines.length === 0) {
    throw new Error("That file does not look like a YouTube Netscape cookies.txt export.");
  }

  return {
    normalized: `${normalized}\n`,
    cookieCount: youtubeCookieLines.length
  };
}

function encryptCookieText(text: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return {
    encryptedCookies: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64")
  };
}

function decryptCookieText(row: CookieExportRow): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(row.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.encrypted_cookies, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export async function getYouTubeCookieStatus(user: User): Promise<YouTubeCookieStatus> {
  await ensureSchema();
  const rows = await sql`
    SELECT cookie_count, updated_at
    FROM youtube_cookie_exports
    WHERE user_id = ${user.id}
    LIMIT 1
  `;
  const row = rows[0] as Pick<CookieExportRow, "cookie_count" | "updated_at"> | undefined;
  return {
    configured: Boolean(row),
    cookieCount: Number(row?.cookie_count ?? 0),
    updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

export async function saveYouTubeCookieExport(user: User, text: string): Promise<YouTubeCookieStatus> {
  await ensureSchema();
  const parsed = parseCookieExport(text);
  const encrypted = encryptCookieText(parsed.normalized);
  const rows = await sql`
    INSERT INTO youtube_cookie_exports (user_id, encrypted_cookies, iv, auth_tag, cookie_count)
    VALUES (
      ${user.id},
      ${encrypted.encryptedCookies},
      ${encrypted.iv},
      ${encrypted.authTag},
      ${parsed.cookieCount}
    )
    ON CONFLICT (user_id) DO UPDATE
    SET encrypted_cookies = ${encrypted.encryptedCookies},
        iv = ${encrypted.iv},
        auth_tag = ${encrypted.authTag},
        cookie_count = ${parsed.cookieCount},
        updated_at = NOW()
    RETURNING cookie_count, updated_at
  `;
  const row = rows[0] as Pick<CookieExportRow, "cookie_count" | "updated_at">;
  return {
    configured: true,
    cookieCount: Number(row.cookie_count ?? parsed.cookieCount),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export async function deleteYouTubeCookieExport(user: User): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM youtube_cookie_exports WHERE user_id = ${user.id}`;
}

export async function writeYouTubeCookieFileForUser(user: User): Promise<{
  cookies: string;
  cleanup: () => Promise<void>;
} | null> {
  await ensureSchema();
  const rows = await sql`
    SELECT encrypted_cookies, iv, auth_tag, cookie_count, updated_at
    FROM youtube_cookie_exports
    WHERE user_id = ${user.id}
    LIMIT 1
  `;
  const row = rows[0] as CookieExportRow | undefined;
  if (!row) return null;

  const dir = path.join(os.tmpdir(), "yt2ctx-user-cookies");
  await mkdir(dir, { recursive: true });
  const cookiePath = path.join(dir, `${user.id}-${randomUUID()}.txt`);
  await writeFile(cookiePath, decryptCookieText(row), { mode: 0o600 });

  return {
    cookies: cookiePath,
    cleanup: () => rm(cookiePath, { force: true })
  };
}
