import { describe, it, expect } from 'vitest';
import { formLogicFn } from '../src/components/formLogic.js';

function createFormData() {
  const fakeWindow = {
    APP_TRANSLATIONS: {},
    PREDEFINED_RULE_SETS: {},
    APP_LANG: 'zh-CN',
    location: {
      origin: 'https://subc.example',
      search: ''
    },
    history: {
      replaceState() {}
    }
  };
  const fn = new Function('window', '(' + formLogicFn.toString() + ')(); return window;');
  const result = fn(fakeWindow);
  return result.formData();
}

describe('formLogic toString fix', () => {
  it('includes parseSurgeConfigInput definition in toString output', () => {
    const fnString = formLogicFn.toString();

    // Verify the function references parseSurgeConfigInput
    expect(fnString).toContain('parseSurgeConfigInput');

    // Verify the arrow function definitions ARE included
    expect(fnString).toMatch(/(?:const|var|let)\s+parseSurgeConfigInput\s*=/);
    expect(fnString).toMatch(/(?:const|var|let)\s+parseSurgeValue\s*=/);
    expect(fnString).toMatch(/(?:const|var|let)\s+convertSurgeIniToJson\s*=/);
  });

  it('does not contain __name calls that break in browser runtime', () => {
    const fnString = formLogicFn.toString();
    // Ensure no function declarations that esbuild would inject __name() for
    expect(fnString).not.toMatch(/^\s*function\s+parseSurgeValue\b/m);
    expect(fnString).not.toMatch(/^\s*function\s+convertSurgeIniToJson\b/m);
    expect(fnString).not.toMatch(/^\s*function\s+parseSurgeConfigInput\b/m);
  });

  it('formData() returns a valid Alpine data object', () => {
    const data = createFormData();
    expect(typeof data.submitForm).toBe('function');
    expect(typeof data.toggleAccordion).toBe('function');
    expect(data.showAdvanced).toBe(false);
  });

  it('adds JamesLab routing params to generated subscription links', async () => {
    const originalDocument = globalThis.document;
    globalThis.document = {
      querySelector(selector) {
        if (selector === 'input[name="customRules"]') {
          return { value: '[]' };
        }
        return null;
      }
    };

    try {
      const data = createFormData();
      data.input = 'https://example.com/sub';
      data.selectedRules = ['Github'];
      data.customUA = '';
      data.enableJameslabRouting = true;

      await data.submitForm();

      const singboxUrl = new URL(data.generatedLinks.singbox);
      const clashUrl = new URL(data.generatedLinks.clash);
      const stashUrl = new URL(data.generatedLinks.stash);
      const surgeUrl = new URL(data.generatedLinks.surge);

      expect(singboxUrl.searchParams.get('routingProfile')).toBe('jameslab');
      expect(surgeUrl.searchParams.get('routingProfile')).toBe('jameslab');
      expect(clashUrl.searchParams.get('routingProfile')).toBe('jameslab');
      expect(clashUrl.searchParams.get('forceProxyProviders')).toBe('true');
      expect(stashUrl.pathname).toBe('/clash');
      expect(stashUrl.searchParams.get('routingProfile')).toBe('jameslab');
      expect(stashUrl.searchParams.get('inlineProxies')).toBe('true');
      expect(stashUrl.searchParams.get('ua')).toBe('Stash/2.6.0');
      expect(stashUrl.searchParams.get('forceProxyProviders')).toBeNull();
      expect(singboxUrl.searchParams.get('forceProxyProviders')).toBeNull();
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it('adds JamesLab routing to subconverter config URL', () => {
    const originalDocument = globalThis.document;
    globalThis.document = {
      querySelector() {
        return { value: '[]' };
      }
    };

    try {
      const data = createFormData();
      data.enableJameslabRouting = true;

      const url = new URL(data.getSubconverterUrl());
      expect(url.pathname).toBe('/subconverter');
      expect(url.searchParams.get('routingProfile')).toBe('jameslab');
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it('restores JamesLab routing switch from parsed URLs', () => {
    const data = createFormData();
    const url = new URL('https://subc.example/clash?config=https%3A%2F%2Fexample.com%2Fsub&routingProfile=jameslab&forceProxyProviders=true');

    data.populateFormFromUrl(url);

    expect(data.enableJameslabRouting).toBe(true);
    expect(data.showAdvanced).toBe(true);
  });
});
