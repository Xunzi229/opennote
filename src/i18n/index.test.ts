import { describe, expect, it } from 'vitest';
import { getCurrentLocale, getLocaleFromLanguage, getMessage, t } from './index';

describe('i18n', () => {
  it('uses Chinese by default', () => {
    expect(getLocaleFromLanguage(undefined)).toBe('zh-CN');
    expect(getLocaleFromLanguage('fr-FR')).toBe('zh-CN');
  });

  it('switches to English for English browser languages', () => {
    expect(getLocaleFromLanguage('en-US')).toBe('en-US');
    expect(getLocaleFromLanguage('en')).toBe('en-US');
  });

  it('detects the browser language list', () => {
    Object.defineProperty(navigator, 'languages', {
      value: ['en-US'],
      configurable: true,
    });

    expect(getCurrentLocale()).toBe('en-US');
  });

  it('returns translated product names', () => {
    expect(getMessage('productName', 'zh-CN')).toBe('网巢笔记');
    expect(getMessage('productName', 'en-US')).toBe('WebNest');
  });

  it('interpolates message variables', () => {
    expect(t('currentSite', { site: 'example.com' }, 'zh-CN')).toBe('当前站点：example.com');
    expect(t('currentSite', { site: 'example.com' }, 'en-US')).toBe('Current site: example.com');
  });
});
