import type { TranslationKey } from './en';

export const zh: Record<TranslationKey, string> = {
  'app.title': '思维图谱',
  'topbar.topic': '输入一个主题或问题…',
  'topbar.apiKey': '{provider} API 密钥',
  'topbar.generate': '生成',
  'topbar.working': '处理中…',
  'topbar.provider': 'LLM 提供方',
  'topbar.language': '语言',
  'topbar.themeToLight': '切换到浅色模式',
  'topbar.themeToDark': '切换到深色模式',
  'canvas.empty': '在上方输入主题并点击「生成」，开始构建思维图。',
  'node.expand': '展开',
  'node.expanding': '展开中…',
  'node.pruned': '已剪枝',
  'expand.needApiKey': '请先在顶部栏输入你的 Gemini API 密钥。',
  'expand.failed': '展开失败：{message}',
};
