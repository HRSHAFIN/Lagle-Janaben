const EMAIL_REGEX = /\S+@\S+\.\S+/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

const BD_PHONE_REGEX = /^01[3-9][0-9]{8}$/;

export function isValidBdPhone(phone: string): boolean {
  return BD_PHONE_REGEX.test(phone);
}

export function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export const PASSWORD_RULES: { key: keyof ReturnType<typeof getPasswordChecks>; label: string }[] = [
  { key: 'length', label: '8+ characters' },
  { key: 'upper', label: '1 uppercase letter' },
  { key: 'lower', label: '1 lowercase letter' },
  { key: 'number', label: '1 number' },
];
