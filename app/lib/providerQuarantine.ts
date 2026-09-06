// Provider quarantine — stop trusting a whole integration when its links are
// failing as a group, not one dog at a time.
//
// The MOO failure was never a MOO problem. APA of Missouri changed shelter
// software and every one of their 29 links died in the same instant, for the
// same reason. Checking dogs individually would eventually have caught them
// one by one; nothing would have said "this entire provider has stopped
// resolving, stop presenting its links as good".
//
// So: measure per provider. When a provider's individually-checked links fail
// above a documented threshold, quarantine the provider — its dogs stop being
// offered as verified destinations until it recovers. Quarantine is scoped
// strictly to the failing provider; every other rescue is untouched.
//
// Two deliberate conservatisms:
//   - Only CONFIRMED failures count. "uncertain" (blocked, timed out) is
//     excluded from the numerator AND the denominator, so a rescue that
//     simply refuses bots is never quarantined for it.
//   - A minimum sample is required. Three dead links out of three is not a
//     broken integration; it may be three adopted dogs.

export type ProviderSample = {
  provider: string;
  confirmedBad: number;
  confirmedGood: number;
  // Not counted either way — recorded so a report can show coverage honestly.
  unverified: number;
};

export type QuarantineDecision = {
  provider: string;
  quarantined: boolean;
  failureRate: number;
  checked: number;
  reason: string;
};

// A provider must have at least this many CONFIRMED results before its
// failure rate means anything.
export const MIN_CONFIRMED_SAMPLE = 8;
// Above this share of confirmed-bad, the integration is broken, not unlucky.
// APA measured 29/29 = 1.00 on 2026-09-06; a healthy provider sits near 0.
export const QUARANTINE_FAILURE_RATE = 0.5;

export function evaluateProvider(sample: ProviderSample): QuarantineDecision {
  const checked = sample.confirmedBad + sample.confirmedGood;
  const failureRate = checked === 0 ? 0 : sample.confirmedBad / checked;

  if (checked < MIN_CONFIRMED_SAMPLE) {
    return {
      provider: sample.provider,
      quarantined: false,
      failureRate,
      checked,
      reason: `only ${checked} confirmed result(s); ${MIN_CONFIRMED_SAMPLE} needed before judging the integration`,
    };
  }
  if (failureRate > QUARANTINE_FAILURE_RATE) {
    return {
      provider: sample.provider,
      quarantined: true,
      failureRate,
      checked,
      reason: `${sample.confirmedBad}/${checked} confirmed destinations are dead (${Math.round(
        failureRate * 100,
      )}%) — above the ${Math.round(QUARANTINE_FAILURE_RATE * 100)}% threshold`,
    };
  }
  return {
    provider: sample.provider,
    quarantined: false,
    failureRate,
    checked,
    reason: `${sample.confirmedBad}/${checked} confirmed destinations dead — within tolerance`,
  };
}

// Group verdicts by provider and decide each one independently. A quarantined
// provider never affects another provider's dogs.
export function evaluateProviders(samples: ProviderSample[]): QuarantineDecision[] {
  return samples.map(evaluateProvider).sort((a, b) => b.failureRate - a.failureRate);
}
