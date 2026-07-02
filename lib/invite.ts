export const REGISTRATION_INVITE_CODE = "BILIGO";

export function normalizeInviteCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

export function validateRegistrationInvite(value: unknown) {
  return normalizeInviteCode(value) === REGISTRATION_INVITE_CODE;
}
