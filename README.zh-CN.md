# paseo-kit

简体中文 | [English](README.md)

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

面向 [Paseo](https://paseo.sh) 的终端风格汉化插件仓库，仅保留 [`ccusage-stats`](plugins/ccusage-stats)（Token 用量统计）。

## 插件功能

- **终端 / TUI 视觉风格**：全量汉化界面、等宽数字对齐、1px 锐利直角边框与终端提示符标题栏，自动适配 Paseo 明暗主题及移动端紧凑布局。
- **侧边栏底栏**：一行展示今日 Token 总量、对比典型日（近 28 天活跃日中位数）的进度仪表以及估算费用。
- **弹出层**：日 / 周 / 月总量、与上一周期的同比变化、直角堆叠柱状图；日视图另附典型日基准与日均 / 折合月均消耗。
- **完整「Token 用量」页面**（支持命令面板打开）：30 天 / 12 周 / 12 个月历史趋势、每百万 Token 成本、缓存命中率、输入/输出/缓存构成、可展开的按 Agent 与模型明细，以及最近会话记录。
- **会话用量胶囊与面板**：每个 Agent 输入框上方显示当前会话 Token 总量，点击可查看主对话、子任务 Agent、Paseo 子 Agent 及模型明细表。
- **主流 AI 品牌配色**：
  - Claude Code：`#D97757`（陶土橘）
  - Codex：`#10A37F`（翡翠绿）
  - Antigravity：`#4285F4`（科技蓝）
  - Gemini CLI：`#8E75FF`（蓝紫）
- **完全离线统计**：内置 `ccusage`（`20.1.2`）直接读取本机日志并按内置 API 标价估算，不向外发送任何数据。

## 环境要求

- Paseo **0.11.1** 及以上（daemon 与 app）。
- daemon 已开启插件（**Settings → Plugins → Enable plugins**）。
- daemon 主机已安装 Node.js 与 npm（用于安装内置 `ccusage` 依赖）。

## 安装

### 从 GitHub 安装（推荐）

```bash
paseo plugin install github:Marsdlc/paseo-kit:plugins/ccusage-stats
```

后续更新：

```bash
paseo plugin update ccusage-stats
```

### 从本地克隆安装

```bash
git clone https://github.com/Marsdlc/paseo-kit.git
cd paseo-kit
npm run install:all
paseo plugin install "$PWD/plugins/ccusage-stats"
paseo plugin ls
```

## 开发流程

```bash
npm run typecheck
paseo plugin reload ccusage-stats
paseo plugin ls
paseo plugin logs ccusage-stats
```

## 许可证

采用 [Apache License 2.0](LICENSE)，另见 [NOTICE](NOTICE)。
