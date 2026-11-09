/**
 * Compute earnings for one valid completed click.
 * Precedence: country+flow → country default → global flow default → global default.
 */
export function computeEarnings({ settings, flowPageCount, country }) {
  const countryRates = settings.countryRates || {};
  const flowRates = settings.flowRates || {};
  const defaultRateMicro = settings.defaultRateMicro ?? 1_000_000;

  const countryKey = String(country || '').toLowerCase();
  const flowKey = String(flowPageCount);

  let rateMicroPer1000;
  if (countryRates[countryKey]?.flows?.[flowKey] != null) {
    rateMicroPer1000 = countryRates[countryKey].flows[flowKey];
  } else if (countryRates[countryKey]?.default != null) {
    rateMicroPer1000 = countryRates[countryKey].default;
  } else if (flowRates[flowKey] != null) {
    rateMicroPer1000 = flowRates[flowKey];
  } else {
    rateMicroPer1000 = defaultRateMicro;
  }

  const publisherSharePercent = Number(settings.publisherSharePercent ?? 99);
  const grossMicro = Math.round(rateMicroPer1000 / 1000);
  const publisherMicro = Math.floor((grossMicro * publisherSharePercent) / 100);
  const platformMicro = grossMicro - publisherMicro;

  return {
    grossMicro,
    publisherMicro,
    platformMicro,
    currency: settings.currency || 'USD',
    source: 'estimated' // change to 'verified' once ad-network revenue API integrated
  };
}