import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    localStorage.clear();
    service = new TranslationService();
  });

  it('defaults to English', () => {
    expect(service.lang()).toBe('en');
    expect(service.translate('action.save')).toBe('Save');
  });

  it('interpolates named params', () => {
    expect(service.translate('dash.greeting', { name: 'Yash' })).toBe('Hi, Yash');
  });

  it('switches language and falls back to English for missing keys', () => {
    service.setLang('hi');
    expect(service.lang()).toBe('hi');
    expect(service.translate('action.save')).toBe('सेव करें');
    // a key not translated in hi.ts falls back to en
    expect(service.translate('setup.create')).toBe('Create Admin account');
  });

  it('returns the key itself when it is unknown everywhere', () => {
    expect(service.translate('totally.unknown.key')).toBe('totally.unknown.key');
  });

  it('persists the chosen language', () => {
    service.setLang('gu');
    expect(localStorage.getItem('jobcard.lang')).toBe('gu');
    expect(new TranslationService().lang()).toBe('gu');
  });
});
