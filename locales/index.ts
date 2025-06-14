import * as en from "./en.json";
import * as zh from "./zh.json";
import * as zhTW from "./zh-TW.json";
import { ObsidianPluginI18n } from "obsidian-plugin-i18n";

export const i18n = new ObsidianPluginI18n({
  en,
  zh,
  "zh-TW": zhTW,
});
