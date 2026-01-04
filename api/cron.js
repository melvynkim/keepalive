import { Redis } from "@upstash/redis";
import { neon } from "@neondatabase/serverless";

/**
 * Vercel Cron -> /api/cron (GET)
 *
 * Configure:
 *   - vercel.json (cron schedule)
 *   - CRON_SECRET (optional but recommended)
 *   - KEEPALIVE_TARGETS (JSON array)
 *
 * Example KEEPALIVE_TARGETS:
 *   [
 *     {
 *       "name": "proj-1",
 *       "neon": "postgresql://USER:PASS@HOST/DB?sslmode=require",
 *       "upstash": { "url": "https://....upstash.io", "token": "...." }
 *     }
 *   ]
 */

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_CONCURRENCY = 5;

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2) + "\n", {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

function getIntEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeError(err) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // allow if not configured
  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

function parseTargets() {
  const raw = process.env.KEEPALIVE_TARGETS;
  if (!raw || !raw.trim()) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("KEEPALIVE_TARGETS must be a JSON array");
  }
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promise, timeoutMs, label) {
  const timeout = sleep(timeoutMs).then(() => {
    throw new Error(`${label} timed out after ${timeoutMs}ms`);
  });
  return Promise.race([promise, timeout]);
}

async function pingNeon({ name, connectionString, timeoutMs }) {
  const started = Date.now();
  const sql = neon(connectionString);
  await withTimeout(sql`SELECT 1 AS ok`, timeoutMs, `neon(${name})`);
  return { ok: true, ms: Date.now() - started };
}

async function pingUpstash({ name, url, token, timeoutMs }) {
  const started = Date.now();
  const redis = new Redis({ url, token });
  const pong = await withTimeout(redis.ping(), timeoutMs, `upstash(${name})`);
  return { ok: pong === "PONG", pong, ms: Date.now() - started };
}

async function pingTarget(target, timeoutMs) {
  const name = target?.name || target?.id || "unnamed";
  const result = {
    name,
    ok: true,
    neon: null,
    upstash: null,
  };

  const tasks = [];

  if (typeof target?.neon === "string" && target.neon.length > 0) {
    tasks.push(
      pingNeon({ name, connectionString: target.neon, timeoutMs })
        .then((r) => (result.neon = r))
        .catch((e) => {
          result.neon = { ok: false, error: normalizeError(e) };
          result.ok = false;
        }),
    );
  }

  if (
    target?.upstash &&
    typeof target.upstash?.url === "string" &&
    typeof target.upstash?.token === "string" &&
    target.upstash.url.length > 0 &&
    target.upstash.token.length > 0
  ) {
    tasks.push(
      pingUpstash({
        name,
        url: target.upstash.url,
        token: target.upstash.token,
        timeoutMs,
      })
        .then((r) => (result.upstash = r))
        .catch((e) => {
          result.upstash = { ok: false, error: normalizeError(e) };
          result.ok = false;
        }),
    );
  }

  // If neither is configured, mark as not ok (misconfigured target)
  if (tasks.length === 0) {
    result.ok = false;
    result.error = "No neon or upstash config found for this target";
    return result;
  }

  await Promise.all(tasks);
  return result;
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  const executing = new Set();

  for (let i = 0; i < items.length; i++) {
    const p = Promise.resolve()
      .then(() => mapper(items[i], i))
      .then((res) => {
        results[i] = res;
      })
      .finally(() => executing.delete(p));

    executing.add(p);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  }

  if (!isAuthorized(request)) {
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const timeoutMs = getIntEnv("KEEPALIVE_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const concurrency = Math.max(
    1,
    Math.min(50, getIntEnv("KEEPALIVE_CONCURRENCY", DEFAULT_CONCURRENCY)),
  );

  const startedAt = new Date().toISOString();

  let targets;
  try {
    targets = parseTargets();
  } catch (e) {
    return json(
      { ok: false, error: normalizeError(e), hint: "Check KEEPALIVE_TARGETS JSON" },
      { status: 400 },
    );
  }

  const results = await mapLimit(targets, concurrency, (t) =>
    pingTarget(t, timeoutMs),
  );

  const okCount = results.filter((r) => r.ok).length;
  const endedAt = new Date().toISOString();

  return json({
    ok: okCount === results.length,
    startedAt,
    endedAt,
    totalTargets: results.length,
    okCount,
    timeoutMs,
    concurrency,
    results,
  });
}
