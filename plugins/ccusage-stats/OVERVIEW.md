在 Paseo 中以终端风格展示本机编码 Agent 的 Token 消耗与估算费用。数据来自内置的 [ccusage](https://github.com/ccusage/ccusage)，离线读取本机 Agent 会话日志，合并统计 Claude Code、Codex、Antigravity、Gemini CLI、OpenCode、Amp 等支持的 Agent。

## 展示位置

侧边栏底栏单行显示今日总 Token、对比典型日（近 28 天活跃日中位数）的费用进度仪表以及今日估算费用。点击可展开弹出层，支持按日 / 周 / 月切换总量、与上一周期的同比变化及堆叠柱状图，日视图同时列出典型日基准与日均 / 折合月均消耗。点击「详情」或从命令面板执行「打开 Token 用量面板」可进入完整页面，查看 30 天 / 12 周 / 12 个月历史、每百万 Token 成本、缓存命中率、输入/输出/缓存构成、可展开的按 Agent 与模型明细及最近会话（含每个会话的平均输出速度 Token/s）。

每个 Agent 输入框上方提供会话用量胶囊，点击或从命令面板执行「打开当前会话用量」可进入「会话用量」面板，查看主对话、子任务 Agent、通过 Paseo 启动的子 Agent 以及按模型拆分的消耗明细。

## 会话匹配方式

插件依据 Paseo 记录的 provider 会话 ID（Claude Code 会话 UUID、Codex rollout 线程 ID 等）精准匹配单次会话；对 Claude Code 恢复或分叉产生的历史会话链会自动回溯汇总，并将子任务 Agent 与 Paseo 子 Agent 区分统计，避免重复计算。

## 刷新与限制

守护进程统一运行一次 ccusage 并将结果缓存 1 分钟；当 Agent 完成一轮对话且近期有人查看过统计时，会在数秒后后台刷新。ccusage 二进制随插件一起安装（覆盖 macOS、Linux、Windows 的 x64 与 arm64），要求 Paseo 0.11.1 及以上。

所有数据均从本机日志离线读取；最近会话的输出速度由 Claude Code / Codex 日志中每次请求的时间戳计算（含首字延迟）。费用按 ccusage 内置的 API 标价表估算，不向外发送任何数据。
