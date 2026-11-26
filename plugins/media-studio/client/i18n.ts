import { defineTranslations } from "@getpaseo/plugin/client";
import zhCN from "./locales/zh-CN.json";

// Always default to Simplified Chinese across Paseo UI locales.
export const messages = defineTranslations({ resources: { en: zhCN, "zh-CN": zhCN } });
