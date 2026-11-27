import { createReadStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type { SessionUsage } from "../shared/usage";
import type { ClaudeLogs } from "./claude-logs";

// ccusage records no durations, so output speed comes from the logs' own timestamps. For every model
// request: output tokens over the time from the request being sent (the last user, tool result or
// request row before it) to its last response row. That includes time to first token, the speed the
// user waits through. A session's speed is its output tokens over the summed request time.

// A gap this long means a missing start row, not a slow request.
const MAX_REQUEST_MS = 15 * 60_000;

export interface Throughput {
  outputTokens: number;
  durationMs: number;
}

const NONE: Throughput = { outputTokens: 0, durationMs: 0 };

function add(a: Throughput, b: Throughput): Throughput {
  return { outputTokens: a.outputTokens + b.outputTokens, durationMs: a.durationMs + b.durationMs };
}

function timeOf(row: { timestamp?: unknown }): number | null {
  if (typeof row.timestamp !== "string") return null;
  const ms = Date.parse(row.timestamp);
  return Number.isNaN(ms) ? null : ms;
}

function count(total: Throughput, outputTokens: number, start: number | null, end: number) {
  if (start === null || outputTokens <= 0) return total;
  const durationMs = end - start;
  if (durationMs <= 0 || durationMs > MAX_REQUEST_MS) return total;
  return add(total, { outputTokens, durationMs });
}

async function eachRow(file: string, visit: (row: Record<string, unknown>) => void) {
  const lines = createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line) continue;
    try {
      const row = JSON.parse(line) as unknown;
      if (row && typeof row === "object") visit(row as Record<string, unknown>);
    } catch {
      // A partly written last line.
    }
  }
}

interface ClaudeMessage {
  start: number | null;
  end: number;
  outputTokens: number;
}

/**
 * Claude Code writes one row per content block of a streamed message, all with the message's id;
 * the usage on the last one is final. Subagent rows of older logs share the file, so each
 * sidechain keeps its own request clock.
 */
async function claudeThroughput(file: string): Promise<Throughput> {
  const messages = new Map<string, ClaudeMessage>();
  const clocks = new Map<string, number>();
  await eachRow(file, (row) => {
    const at = timeOf(row);
    if (at === null) return;
    const stream =
      typeof row.agentId === "string" ? row.agentId : row.isSidechain === true ? "sidechain" : "";
    if (row.type === "user" || row.type === "api-request") {
      clocks.set(stream, Math.max(clocks.get(stream) ?? at, at));
      return;
    }
    if (row.type !== "assistant") return;
    const message = row.message as { id?: unknown; usage?: { output_tokens?: unknown } } | undefined;
    if (typeof message?.id !== "string") return;
    const key = `${message.id}:${typeof row.requestId === "string" ? row.requestId : ""}`;
    const output = typeof message.usage?.output_tokens === "number" ? message.usage.output_tokens : 0;
    const seen = messages.get(key);
    if (seen) {
      seen.end = Math.max(seen.end, at);
      seen.outputTokens = Math.max(seen.outputTokens, output);
    } else {
      messages.set(key, { start: clocks.get(stream) ?? null, end: at, outputTokens: output });
    }
    // The next message on this stream cannot have started before this one ended.
    clocks.set(stream, Math.max(clocks.get(stream) ?? at, at));
  });
  let total = NONE;
  for (const message of messages.values()) {
    total = count(total, message.outputTokens, message.start, message.end);
  }
  return total;
}

const CODEX_INPUTS = new Set(["function_call_output", "custom_tool_call_output", "local_shell_call_output"]);

function outputTokensOf(usage: unknown): number {
  const value = (usage as { output_tokens?: unknown } | null | undefined)?.output_tokens;
  return typeof value === "number" ? value : 0;
}

/**
 * A Codex response runs from the last input item (user message, tool output) to its last output
 * item. Newer rollouts close each response with a `token_usage_record`; older ones only have
 * `token_count` events, which can arrive after the tools ran, so the end is the last output item.
 */
async function codexThroughput(file: string): Promise<Throughput> {
  let start: number | null = null;
  let lastOutput: number | null = null;
  let records = NONE;
  let counts = NONE;
  let hasRecords = false;
  await eachRow(file, (row) => {
    const at = timeOf(row);
    if (at === null) return;
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    if (row.type === "response_item") {
      const isInput =
        (payload.type === "message" && payload.role !== "assistant") ||
        CODEX_INPUTS.has(String(payload.type));
      if (isInput) {
        start = at;
        lastOutput = null;
      } else {
        lastOutput = at;
      }
      return;
    }
    if (row.type === "token_usage_record") {
      hasRecords = true;
      if (lastOutput !== null) records = count(records, outputTokensOf(payload.usage), start, lastOutput);
      start = lastOutput ?? start;
      lastOutput = null;
      return;
    }
    if (row.type === "event_msg" && payload.type === "token_count" && !hasRecords) {
      // A repeated count with no new output belongs to the response already counted.
      if (lastOutput === null) return;
      const info = payload.info as { last_token_usage?: unknown } | null | undefined;
      counts = count(counts, outputTokensOf(info?.last_token_usage), start, lastOutput);
      start = lastOutput;
      lastOutput = null;
    }
  });
  return hasRecords ? records : counts;
}

function codexHome(): string {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

/** ccusage names a Codex session after its rollout path under `sessions/`. */
async function codexFile(id: string): Promise<string | null> {
  const home = codexHome();
  const candidates = [
    path.join(home, "sessions", `${id}.jsonl`),
    path.join(home, "archived_sessions", `${path.basename(id)}.jsonl`),
  ];
  for (const file of candidates) {
    if (await fs.stat(file).then((stat) => stat.isFile(), () => false)) return file;
  }
  return null;
}

interface Cached {
  size: number;
  mtimeMs: number;
  result: Throughput;
}

export function createThroughputReader(logs: ClaudeLogs) {
  const cache = new Map<string, Cached>();

  /** A log is only reread when its size or mtime changed. */
  async function read(file: string, parse: (file: string) => Promise<Throughput>) {
    const stat = await fs.stat(file).catch(() => null);
    if (!stat) return NONE;
    const cached = cache.get(file);
    if (cached && cached.size === stat.size && cached.mtimeMs === stat.mtimeMs) return cached.result;
    const result = await parse(file).catch(() => NONE);
    cache.set(file, { size: stat.size, mtimeMs: stat.mtimeMs, result });
    return result;
  }

  async function sessionThroughput(session: SessionUsage): Promise<Throughput> {
    if (session.agent === "claude") {
      const file = await logs.file(session.id);
      if (!file) return NONE;
      let total = await read(file, claudeThroughput);
      for (const subagent of await logs.subagents([session.id])) {
        total = add(total, await read(subagent.file, claudeThroughput));
      }
      return total;
    }
    if (session.agent === "codex") {
      const file = await codexFile(session.id);
      return file ? read(file, codexThroughput) : NONE;
    }
    return NONE;
  }

  return {
    /** Average output tokens per second, or null when the logs have no timing for the session. */
    async outputSpeed(session: SessionUsage): Promise<number | null> {
      const { outputTokens, durationMs } = await sessionThroughput(session).catch(() => NONE);
      return durationMs > 0 ? (outputTokens / durationMs) * 1000 : null;
    },
  };
}

export type ThroughputReader = ReturnType<typeof createThroughputReader>;
