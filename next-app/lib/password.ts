// Password strength validation
const MIN_LENGTH = 8;

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_LENGTH} characters` };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  return { valid: true };
}
