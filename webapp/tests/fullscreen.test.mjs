import test from 'node:test';
import assert from 'node:assert/strict';
import { isIos } from '../src/fullscreen.ts';

test('iPad and iPhone never request the Android fullscreen API', () => {
  assert.equal(isIos({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }), true);
  assert.equal(isIos({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }), true);
  assert.equal(isIos({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 }), true);
});

test('Android phones are not treated as iOS', () => {
  assert.equal(isIos({
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
    maxTouchPoints: 5,
  }), false);
});
