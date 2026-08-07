const BD_PHONE_REGEX = /^(?:\+?880|0)1[3-9]\d{8}$/;

export function isValidBangladeshiPhoneNumber(value: string): boolean {
  const normalized = value.replace(/[\s-]/g, "");
  return BD_PHONE_REGEX.test(normalized);
}
