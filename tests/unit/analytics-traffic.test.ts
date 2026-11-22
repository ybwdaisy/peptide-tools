import test from 'node:test';
import assert from 'node:assert/strict';
import { isQaTraffic, QA_STORAGE_KEY, resolveQaFlag } from '../../src/lib/analytics-traffic';

test('manual flags, reset, sticky mode and automation have explicit precedence', () => {
  assert.equal(resolveQaFlag(''), false);
  assert.equal(resolveQaFlag('?qa=1'), true);
  assert.equal(resolveQaFlag('?analytics_test=1'), true);
  assert.equal(resolveQaFlag('', true), true);
  assert.equal(resolveQaFlag('?analytics_test=0', true), false);
  assert.equal(resolveQaFlag('?analytics_test=0', false, true), true);
});

test('QA is captured before consent, persists through navigation and tabs, and fails closed without storage', () => {
  const names = ['window', 'navigator', 'localStorage', 'sessionStorage'] as const;
  const originals = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const storage = (map: Map<string, string>) => ({ getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => map.set(key, value), removeItem: (key: string) => map.delete(key) });
  const location = { search: '?analytics_test=0' };
  const navigator = { webdriver: false };
  const set = (name: string, value: unknown) => Object.defineProperty(globalThis, name, { configurable: true, value });
  set('window', { location }); set('navigator', navigator);
  set('localStorage', storage(local)); set('sessionStorage', storage(session));
  try {
    assert.equal(isQaTraffic(), false);
    location.search = '?analytics_test=1';
    assert.equal(isQaTraffic(), true);
    assert.equal(local.get(QA_STORAGE_KEY), '1');
    location.search = ''; session.clear();
    assert.equal(isQaTraffic(), true);
    location.search = '?analytics_test=0';
    assert.equal(isQaTraffic(), false);
    assert.equal(local.has(QA_STORAGE_KEY), false);
    navigator.webdriver = true;
    assert.equal(isQaTraffic(), true);
    navigator.webdriver = false;
    set('localStorage', { getItem() { throw new Error('blocked'); } });
    set('sessionStorage', { getItem() { throw new Error('blocked'); } });
    assert.equal(isQaTraffic(), true);
  } finally {
    names.forEach((name, index) => { if (originals[index]) Object.defineProperty(globalThis, name, originals[index]!); else Reflect.deleteProperty(globalThis, name); });
  }
});
