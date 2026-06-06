/// <reference types="vite/client" />

/**
 * Afdian (爱发电) integration utilities.
 * Ported from YuanluPro project.
 */

/**
 * Build an afdian payment URL that links directly to a specific plan's checkout page.
 * The remark parameter carries the user's email for post-payment identification.
 *
 * Example output:
 * https://ifdian.net/order/create?plan_id=xxx&product_type=0&month=3&remark=...
 */
export function buildAfdianPaymentUrl(params: {
  planId: string;
  months: number;
  remark: string;
}): string {
  const searchParams = new URLSearchParams({
    plan_id: params.planId,
    product_type: "0",
    month: String(params.months),
    remark: params.remark,
  });
  return `https://ifdian.net/order/create?${searchParams.toString()}`;
}

/** Default afdian plan IDs (can be overridden via VITE_AFDIAN_PLAN_ID_* env vars). */
const DEFAULT_PLAN_IDS: Record<string, string> = {
  WEEKLY: "288647865e5011f1b9f452540025c377",
  MONTHLY: "83afbe20380e11f1917552540025c377",
  QUARTERLY: "882e1e46380f11f1a8b252540025c377",
  YEARLY: "f8a295b2380f11f1b24a52540025c377",
};

/**
 * Resolve a plan key ("WEEKLY", "MONTHLY", etc.) to its afdian plan_id.
 * Client-side env vars (VITE_AFDIAN_PLAN_ID_*) take precedence over defaults.
 */
export function getAfdianPlanId(planKey: string): string {
  try {
    // Vite client-side env vars
    const envMap: Record<string, string | undefined> = {
      WEEKLY: import.meta.env?.VITE_AFDIAN_PLAN_ID_WEEKLY,
      MONTHLY: import.meta.env?.VITE_AFDIAN_PLAN_ID_MONTHLY,
      QUARTERLY: import.meta.env?.VITE_AFDIAN_PLAN_ID_QUARTERLY,
      YEARLY: import.meta.env?.VITE_AFDIAN_PLAN_ID_YEARLY,
    };
    if (envMap[planKey]) return envMap[planKey]!;
  } catch {
    // import.meta.env not available (e.g. SSR)
  }

  return DEFAULT_PLAN_IDS[planKey] || "";
}

/**
 * Construct a remark string that embeds the user's email.
 * Afdian will pre-fill this as the payment message.
 */
export function buildRemark(userEmail: string): string {
  return `${userEmail}`;
}
