import { DISPUTE_WINDOW_MINUTES, PAYOUT_DELAY_MINUTES } from "@contracts/catalog";

/**
 * Trade-window durations. The contracts constants are the production truth
 * (9-minute dispute window, 10-minute payout delay); the *_SECONDS env vars
 * exist so automated tests can compress the timeline without touching code.
 */
export function disputeWindowMs(): number {
  const override = Number(process.env.DISPUTE_WINDOW_SECONDS);
  return (Number.isFinite(override) && override > 0 ? override : DISPUTE_WINDOW_MINUTES * 60) * 1000;
}

export function payoutDelayMs(): number {
  const override = Number(process.env.PAYOUT_DELAY_SECONDS);
  return (Number.isFinite(override) && override > 0 ? override : PAYOUT_DELAY_MINUTES * 60) * 1000;
}

export function sweepIntervalMs(): number {
  const override = Number(process.env.SWEEP_INTERVAL_SECONDS);
  return (Number.isFinite(override) && override > 0 ? override : 15) * 1000;
}
