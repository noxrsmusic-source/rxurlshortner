import { test } from 'node:test';
import assert from 'node:assert/strict';
import './setup.js';
import { computeEarnings } from '../services/earnings.service.js';

const settings = {
  flowRates: { 1: 1_500_000, 2: 2_500_000, 3: 3_500_000, 4: 5_000_000 },
  defaultRateMicro: 1_000_000,
  countryRates: { us: { default: 5_000_000 }, in: { default: 2_000_000 } },
  publisherSharePercent: 99, currency: 'USD'
};

test('Earnings: country-specific rate wins over flow default', () => {
  const e = computeEarnings({ settings, flowPageCount: 2, country: 'us' });
  // us default = $5/1000 = 5000 micro per click, 99% = 4950
  assert.equal(e.grossMicro, 5000);
  assert.equal(e.publisherMicro, 4950);
  assert.equal(e.platformMicro, 50);
});

test('Earnings: flow default applies when country has no override', () => {
  const e = computeEarnings({ settings, flowPageCount: 3, country: 'zz' });
  // 3-page default = $3.5/1000 = 3500 micro per click, 99% = 3465
  assert.equal(e.grossMicro, 3500);
  assert.equal(e.publisherMicro, 3465);
});

test('Earnings: default rate applies when no country, no flow override', () => {
  const settingsNoFlow = { ...settings, flowRates: {} };
  const e = computeEarnings({ settings: settingsNoFlow, flowPageCount: 1, country: 'zz' });
  // default = $1/1000 = 1000 micro
  assert.equal(e.grossMicro, 1000);
  assert.equal(e.publisherMicro, 990);
});