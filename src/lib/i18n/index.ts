import { usePrefsStore, type Lang } from '@/lib/store/prefsStore';
import { en, type TranslationKey } from './en';
import { zh } from './zh';
import { ms } from './ms';

const dictionaries: Record<Lang, Record<TranslationKey, string>> = {
  en,
  zh,
  ms,
};

export type { TranslationKey };

export const LANGUAGE_LABELS: Record<Lang, string> = {
  en: 'English',
  zh: '中文',
  ms: 'Bahasa Melayu',
};

export function translate(
  lang: Lang,
  key: TranslationKey,
  vars?: Record<string, string>,
): string {
  let str = dictionaries[lang][key] ?? en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.replaceAll(`{${name}}`, value);
    }
  }
  return str;
}

// React hook: returns a `t(key, vars?)` function bound to the current language.
export function useT(): (
  key: TranslationKey,
  vars?: Record<string, string>,
) => string {
  const lang = usePrefsStore((s) => s.lang);
  return (key, vars) => translate(lang, key, vars);
}
