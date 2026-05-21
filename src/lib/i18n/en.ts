export const en = {
  'app.title': 'Graph-of-Thought',
  'topbar.topic': 'Enter a topic or problem…',
  'topbar.apiKey': '{provider} API key',
  'topbar.generate': 'Generate',
  'topbar.working': 'Working…',
  'topbar.provider': 'LLM provider',
  'topbar.model': 'Model',
  'topbar.modelCustom': 'Custom…',
  'topbar.modelCustomPlaceholder': 'Enter model id',
  'topbar.language': 'Language',
  'topbar.themeToLight': 'Switch to light mode',
  'topbar.themeToDark': 'Switch to dark mode',
  'canvas.empty':
    'Enter a topic above and press Generate to start a thought graph.',
  'node.expand': 'Expand',
  'node.expanding': 'Expanding…',
  'node.pruned': 'pruned',
  'expand.needApiKey': 'Enter your Gemini API key in the top bar first.',
  'expand.failed': 'Expansion failed: {message}',
};

export type TranslationKey = keyof typeof en;
