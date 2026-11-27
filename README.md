# paseo-kit

[![typecheck](https://github.com/Marsdlc/paseo-kit/actions/workflows/typecheck.yml/badge.svg)](https://github.com/Marsdlc/paseo-kit/actions/workflows/typecheck.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[简体中文](README.zh-CN.md) | English

A Chinese [Paseo](https://paseo.sh) plugin repository containing `ccusage-stats` and `claude-theme`.

## Plugins

| ID | Name | What it does |
| --- | --- | --- |
| [`ccusage-stats`](plugins/ccusage-stats) | Token 用量统计 | Terminal-style Chinese token usage and estimated cost dashboard for coding agents via [ccusage](https://github.com/ccusage/ccusage): today's total, day/week/month breakdown by agent with brand colors, and per-session composer pill & detail panel. |
| [`claude-theme`](plugins/claude-theme) | Claude 主题 | Themes inspired by the Claude desktop app: Claude 亮色 (warm paper-toned light), Claude 暗色 (cool dark gray), and Claude 跟随系统, which follows the system light/dark mode. |

### ccusage-stats highlights

- Sidebar footer line with today's tokens, a pace bar comparing today's estimated cost against your typical day (28-day active median), and estimated cost.
- Popover with day / week / month totals, period-over-period change, and stacked bar charts.
- Full **Token 用量** screen (also in Command Center): 30 days / 12 weeks / 12 months history, cost per million tokens, cache hit rate, input/output/cache composition, expandable per-agent and per-model breakdown, and recent sessions with their average output speed (tokens/s).
- Per-agent composer pill and **会话用量** panel covering main conversation, subagents, Paseo child agents, and model tables.
- Signature brand colors for Claude Code (`#D97757`), Codex (`#10A37F`), Antigravity (`#4285F4`), and Gemini CLI (`#8E75FF`).
- Powered by bundled `ccusage` (`20.1.2`), reading local session logs offline with nothing sent off the host.

## Install

### From GitHub

```bash
paseo plugin install github:Marsdlc/paseo-kit:plugins/ccusage-stats
paseo plugin install github:Marsdlc/paseo-kit:plugins/claude-theme
```

Update later with:

```bash
paseo plugin update ccusage-stats
paseo plugin update claude-theme
```

After installing `claude-theme`, pick a theme in **Settings → Appearance**.

### From a local clone

```bash
git clone https://github.com/Marsdlc/paseo-kit.git
cd paseo-kit
npm run install:all
paseo plugin install "$PWD/plugins/ccusage-stats"
paseo plugin install "$PWD/plugins/claude-theme"
paseo plugin ls
```

## Development

```bash
npm run typecheck
paseo plugin reload ccusage-stats   # or claude-theme
paseo plugin ls
paseo plugin logs ccusage-stats
```

## License

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE).
