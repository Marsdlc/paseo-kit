# ccusage-stats

基于 `ccusage` 的终端风格汉化 Paseo 插件，统计编码 Agent 的 Token 消耗与估算费用。

详细说明见 [OVERVIEW.md](OVERVIEW.md)。

## 安装

```bash
paseo plugin install github:Marsdlc/paseo-kit:plugins/ccusage-stats
```

或从本地克隆安装：

```bash
cd plugins/ccusage-stats && npm install
paseo plugin install "$PWD"
```

需要 Paseo 0.11.1 及以上并在 daemon 中开启插件。

## 开发

```bash
npm run typecheck
paseo plugin reload ccusage-stats
paseo plugin logs ccusage-stats
```
