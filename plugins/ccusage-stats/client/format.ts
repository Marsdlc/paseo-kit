import type { PeriodKind } from "../shared/usage";

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** "999", "345K", "28.0M", "1.26B": three significant digits, never more than five characters. */
export function formatTokens(tokens: number): string {
  const value = Math.max(tokens, 0);
  if (value < 999.5) return `${Math.round(value)}`;
  let scaled = value;
  for (const unit of ["K", "M", "B", "T"]) {
    scaled /= 1000;
    // Thresholds sit below the rounding points: 9.996 would print as "10.00", 999.6 as "1000".
    if (scaled < 9.995) return `${scaled.toFixed(2)}${unit}`;
    if (scaled < 99.95) return `${scaled.toFixed(1)}${unit}`;
    if (scaled < 999.5 || unit === "T") return `${Math.round(scaled)}${unit}`;
  }
  return "";
}

/** "$0.42", "$12.30", "$118", "$1.2K". */
export function formatCost(cost: number): string {
  const value = Math.max(cost, 0);
  if (value === 0) return "$0";
  if (value < 0.005) return "<$0.01";
  if (value < 99.995) return `$${value.toFixed(2)}`;
  if (value < 999.5) return `$${Math.round(value)}`;
  return `$${(value / 1000).toFixed(1)}K`;
}

/** Output speed: "8.4 t/s", "52 t/s". */
export function formatSpeed(tokensPerSecond: number): string {
  const value = Math.max(tokensPerSecond, 0);
  return `${value < 9.95 ? value.toFixed(1) : Math.round(value)} t/s`;
}

export function formatPercent(fraction: number): string {
  const percent = fraction * 100;
  if (percent > 0 && percent < 1) return "<1%";
  return `${Math.round(percent)}%`;
}

function parseKey(key: string): { year: number; month: number; day: number } {
  const [year = 1970, month = 1, day = 1] = key.split("-").map(Number);
  return { year, month, day };
}

/** Axis labels: "12", "10/5", "10月". */
export function formatPeriodShort(kind: PeriodKind, key: string): string {
  const { month, day } = parseKey(key);
  if (kind === "monthly") return `${month}月`;
  if (kind === "weekly") return `${month}/${day}`;
  return `${day}`;
}

/** Headline labels: "10月12日 周一", "10月5日 当周", "2026年10月". */
export function formatPeriodLong(kind: PeriodKind, key: string): string {
  const { year, month, day } = parseKey(key);
  if (kind === "monthly") return `${year}年${month}月`;
  if (kind === "weekly") return `${month}月${day}日 当周`;
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}月${day}日 ${weekday}`;
}

export const CURRENT_LABEL: Record<PeriodKind, string> = {
  daily: "今日",
  weekly: "本周",
  monthly: "本月",
};

export const PREVIOUS_LABEL: Record<PeriodKind, string> = {
  daily: "昨日",
  weekly: "上周",
  monthly: "上月",
};

export function formatAgo(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 10) return "刚刚";
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}小时前`;
  return `${Math.round(hours / 24)}天前`;
}

const AGENT_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  opencode: "OpenCode",
  amp: "Amp",
  droid: "Droid",
  codebuff: "Codebuff",
  hermes: "Hermes",
  pi: "Pi",
  goose: "Goose",
  kilo: "Kilo",
  copilot: "Copilot CLI",
  gemini: "Gemini CLI",
  antigravity: "Antigravity",
  kimi: "Kimi",
  qwen: "Qwen",
  openclaw: "OpenClaw",
  grok: "Grok Build",
  zcode: "ZCode",
  other: "其他",
};

export function agentLabel(agent: string): string {
  return AGENT_LABELS[agent] ?? agent.charAt(0).toUpperCase() + agent.slice(1);
}

/** A Codex rollout name or a UUID, shortened to something recognizable. */
export function shortSessionId(id: string): string {
  const tail = id.split(/[/-]/).filter(Boolean);
  const uuidStart = tail.length >= 5 ? tail[tail.length - 5] : undefined;
  return (uuidStart ?? id).slice(0, 8);
}
