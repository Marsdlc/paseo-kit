# paseo-kit

[![typecheck](https://github.com/Marsdlc/paseo-kit/actions/workflows/typecheck.yml/badge.svg)](https://github.com/Marsdlc/paseo-kit/actions/workflows/typecheck.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[简体中文](README.zh-CN.md) | English

A terminal-style Chinese [Paseo](https://paseo.sh) plugin repository containing `ccusage-stats`.

## Plugin

| ID | Name | What it does |
| --- | --- | --- |
| [`ccusage-stats`](plugins/ccusage-stats) | Token 用量统计 | Terminal-style Chinese token usage and estimated cost dashboard for coding agents via [ccusage](https://github.com/ccusage/ccusage): today's total, day/week/month breakdown by agent with brand colors, and per-session composer pill & detail panel. |

### Highlights

- Sidebar footer line with today's tokens, a pace bar comparing today's estimated cost against your typical day (28-day active median), and estimated cost.
- Popover with day / week / month totals, period-over-period change, and stacked bar charts.
- Full **Token 用量** screen (also in Command Center): 30 days / 12 weeks / 12 months history, cost per million tokens, cache hit rate, input/output/cache composition, expandable per-agent and per-model breakdown, and recent sessions.
- Per-agent composer pill and **会话用量** panel covering main conversation, subagents, Paseo child agents, and model tables.
- Signature brand colors for Claude Code (`#D97757`), Codex (`#10A37F`), Antigravity (`#4285F4`), and Gemini CLI (`#8E75FF`).
- Powered by bundled `ccusage` (`20.1.2`), reading local session logs offline with nothing sent off the host.

## Install

### From GitHub

```bash
paseo plugin install github:Marsdlc/paseo-kit:plugins/ccusage-stats
```

Update later with:

```bash
paseo plugin update ccusage-stats
```

### From a local clone

```bash
git clone https://github.com/Marsdlc/paseo-kit.git
cd paseo-kit
npm run install:all
paseo plugin install "$PWD/plugins/ccusage-stats"
paseo plugin ls
```

## Development

```bash
npm run typecheck
paseo plugin reload ccusage-stats
paseo plugin ls
paseo plugin logs ccusage-stats
```

## License

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE).
