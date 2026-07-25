export type DemandScoreInput = {
  uniqueVisitors: number;
  signups: number;
  referralSignups: number;
  recentSignups: number;
  previousSignups: number;
};

export type DemandScoreResult = {
  eligible: boolean;
  minimumVisitors: number;
  score: number | null;
  components: {
    conversion: number;
    referral: number;
    volume: number;
    momentum: number;
  };
};

export const DEMAND_SCORE_MINIMUM_VISITORS = 100;

function clamp(value: number, minimum = 0, maximum = 100) {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}

function roundScore(value: number) {
  return Math.round(clamp(value));
}

/**
 * Deterministic normalization:
 * - Conversion reaches 100 at a bounded 25% visitor-to-signup rate.
 * - Referrals reach 100 when 30% of signups are valid referred signups.
 * - Volume uses a square-root curve and reaches 100 at 250 signups, which
 *   rewards real scale without letting a viral spike dominate forever.
 * - Momentum maps flat week-over-week growth to 50, a 100% decline to 0, and
 *   100% growth to 100. A project with no recent signups always receives 0.
 */
export function calculateDemandScore(
  input: DemandScoreInput,
): DemandScoreResult {
  const visitors = Math.max(0, input.uniqueVisitors);
  const signups = Math.max(0, input.signups);
  const referrals = clamp(input.referralSignups, 0, signups);
  const recent = Math.max(0, input.recentSignups);
  const previous = Math.max(0, input.previousSignups);

  const conversionRate = visitors ? signups / visitors : 0;
  const referralRate = signups ? referrals / signups : 0;
  const conversion = roundScore((conversionRate / 0.25) * 100);
  const referral = roundScore((referralRate / 0.3) * 100);
  const volume = roundScore(Math.sqrt(clamp(signups / 250, 0, 1)) * 100);

  let momentum = 0;
  if (recent > 0 && previous === 0) {
    momentum = roundScore(Math.min(75, 50 + recent * 5));
  } else if (recent > 0) {
    const growth = clamp((recent - previous) / previous, -1, 1);
    momentum = roundScore(50 + growth * 50);
  }

  const components = { conversion, referral, volume, momentum };
  const eligible = visitors >= DEMAND_SCORE_MINIMUM_VISITORS;
  const weighted =
    conversion * 0.4 + referral * 0.25 + volume * 0.2 + momentum * 0.15;

  return {
    eligible,
    minimumVisitors: DEMAND_SCORE_MINIMUM_VISITORS,
    score: eligible ? roundScore(weighted) : null,
    components,
  };
}
