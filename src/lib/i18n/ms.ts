import type { TranslationKey } from './en';

export const ms: Record<TranslationKey, string> = {
  'app.title': 'Graf Pemikiran',
  'topbar.topic': 'Masukkan topik atau masalah…',
  'topbar.apiKey': 'Kunci API {provider}',
  'topbar.generate': 'Jana',
  'topbar.working': 'Memproses…',
  'topbar.provider': 'Penyedia LLM',
  'topbar.language': 'Bahasa',
  'topbar.themeToLight': 'Tukar ke mod terang',
  'topbar.themeToDark': 'Tukar ke mod gelap',
  'canvas.empty':
    'Masukkan topik di atas dan tekan Jana untuk memulakan graf pemikiran.',
  'node.expand': 'Kembang',
  'node.expanding': 'Mengembang…',
  'node.pruned': 'dipangkas',
  'expand.needApiKey': 'Masukkan kunci API Gemini anda di bar atas dahulu.',
  'expand.failed': 'Pengembangan gagal: {message}',
};
