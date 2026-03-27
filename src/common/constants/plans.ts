export const PLAN_LIMITS: Record<string, { maxStampCards: number; allowOtp: boolean }> = {
  free:    { maxStampCards: 0, allowOtp: false },
  premium: { maxStampCards: Infinity, allowOtp: true },
};
