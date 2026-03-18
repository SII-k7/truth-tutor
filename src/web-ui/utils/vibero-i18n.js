// vibero-i18n.js - Simple i18n helper for Vibero features

export class ViberoI18n {
  constructor(locale = 'zh-CN', translations = {}) {
    this.locale = locale;
    this.translations = {
      'zh-CN': {
        // Annotation types
        'annotation.translation': '翻译',
        'annotation.explanation': '解释',
        'annotation.concept': '概念',
        'annotation.question': '问题',
        'annotation.note': '笔记',
        
        // UI labels
        'ui.loading': '加载中...',
        'ui.close': '关闭',
        'ui.previous': '上一个',
        'ui.next': '下一个',
        'ui.expand': '展开',
        'ui.collapse': '收起',
        
        // Navigation
        'nav.outline': '文章脉络',
        'nav.sections': '章节',
        'nav.progress': '阅读进度',
        'nav.previous_section': '上一章节',
        'nav.next_section': '下一章节',
        
        // AI Sidebar
        'ai.title': 'AI 解答',
        'ai.thinking': 'AI 正在思考...',
        'ai.error': '加载失败',
        'ai.original': '原文',
        'ai.translation': '翻译',
        'ai.explanation': '解答',
        'ai.reference': '参考',
        
        // Reading mode
        'mode.immersive': '沉浸式阅读',
        'mode.focus': '专注模式',
        'mode.normal': '普通模式',
        
        // Tooltips
        'tooltip.click_for_details': '点击查看详情',
        'tooltip.hover_for_translation': '悬停查看翻译',
        
        // Empty states
        'empty.no_sections': '暂无章节',
        'empty.no_annotations': '暂无标注',
      },
      'en-US': {
        // Annotation types
        'annotation.translation': 'Translation',
        'annotation.explanation': 'Explanation',
        'annotation.concept': 'Concept',
        'annotation.question': 'Question',
        'annotation.note': 'Note',
        
        // UI labels
        'ui.loading': 'Loading...',
        'ui.close': 'Close',
        'ui.previous': 'Previous',
        'ui.next': 'Next',
        'ui.expand': 'Expand',
        'ui.collapse': 'Collapse',
        
        // Navigation
        'nav.outline': 'Outline',
        'nav.sections': 'Sections',
        'nav.progress': 'Reading Progress',
        'nav.previous_section': 'Previous Section',
        'nav.next_section': 'Next Section',
        
        // AI Sidebar
        'ai.title': 'AI Explanation',
        'ai.thinking': 'AI is thinking...',
        'ai.error': 'Failed to load',
        'ai.original': 'Original',
        'ai.translation': 'Translation',
        'ai.explanation': 'Explanation',
        'ai.reference': 'Reference',
        
        // Reading mode
        'mode.immersive': 'Immersive Reading',
        'mode.focus': 'Focus Mode',
        'mode.normal': 'Normal Mode',
        
        // Tooltips
        'tooltip.click_for_details': 'Click for details',
        'tooltip.hover_for_translation': 'Hover for translation',
        
        // Empty states
        'empty.no_sections': 'No sections',
        'empty.no_annotations': 'No annotations',
      },
      ...translations
    };
  }

  // Get translation for a key
  t(key, params = {}) {
    const localeTranslations = this.translations[this.locale] || this.translations['en-US'];
    let text = localeTranslations[key] || key;
    
    // Replace parameters
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
  }

  // Set locale
  setLocale(locale) {
    this.locale = locale;
  }

  // Get current locale
  getLocale() {
    return this.locale;
  }

  // Add custom translations
  addTranslations(locale, translations) {
    if (!this.translations[locale]) {
      this.translations[locale] = {};
    }
    Object.assign(this.translations[locale], translations);
  }

  // Detect browser locale
  static detectLocale() {
    const browserLocale = navigator.language || navigator.userLanguage;
    
    // Map common locales
    const localeMap = {
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'zh-HK': 'zh-HK',
      'en': 'en-US',
      'en-US': 'en-US',
      'en-GB': 'en-GB',
    };
    
    return localeMap[browserLocale] || localeMap[browserLocale.split('-')[0]] || 'en-US';
  }
}

// Translation service for async translations (e.g., API-based)
export class ViberoTranslationService {
  constructor(apiEndpoint = null, apiKey = null) {
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
    this.cache = new Map();
  }

  // Translate text
  async translate(text, targetLang = 'zh-CN', sourceLang = 'auto') {
    const cacheKey = `${text}:${sourceLang}:${targetLang}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // If no API endpoint, return mock translation
    if (!this.apiEndpoint) {
      const mockTranslation = this._mockTranslate(text, targetLang);
      this.cache.set(cacheKey, mockTranslation);
      return mockTranslation;
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          text,
          source_lang: sourceLang,
          target_lang: targetLang
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      const translation = data.translation || data.text || text;
      
      this.cache.set(cacheKey, translation);
      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text on error
    }
  }

  // Mock translation for demo purposes
  _mockTranslate(text, targetLang) {
    // Simple mock - in production, use real translation API
    if (targetLang === 'zh-CN') {
      const mockMap = {
        'Introduction': '引言',
        'Conclusion': '结论',
        'Abstract': '摘要',
        'References': '参考文献',
        'Methodology': '方法论',
        'Results': '结果',
        'Discussion': '讨论',
      };
      return mockMap[text] || `[译] ${text}`;
    }
    return text;
  }

  // Batch translate multiple texts
  async translateBatch(texts, targetLang = 'zh-CN', sourceLang = 'auto') {
    return Promise.all(
      texts.map(text => this.translate(text, targetLang, sourceLang))
    );
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const i18n = new ViberoI18n(ViberoI18n.detectLocale());
export const translationService = new ViberoTranslationService();
