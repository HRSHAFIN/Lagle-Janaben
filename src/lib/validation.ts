const EMAIL_REGEX = /\S+@\S+\.\S+/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

const BD_PHONE_REGEX = /^01[3-9][0-9]{8}$/;

export function isValidBdPhone(phone: string): boolean {
  return BD_PHONE_REGEX.test(phone);
}
