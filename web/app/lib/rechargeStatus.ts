export type MobileRechargeStatus = "SUCCESS" | "FAILED";

export type MobileRechargeStatusTone = "success" | "error";

export const RECHARGE_STATUS_TONE: Record<MobileRechargeStatus, MobileRechargeStatusTone> = {
  SUCCESS: "success",
  FAILED: "error",
};

export const RECHARGE_STATUS_LABEL: Record<MobileRechargeStatus, string> = {
  SUCCESS: "Successful",
  FAILED: "Failed",
};
