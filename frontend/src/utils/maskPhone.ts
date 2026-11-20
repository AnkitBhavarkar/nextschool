/**
 * Masks phone numbers to protect student and parent PII privacy.
 * Shows only the first 5 digits of the mobile number, masking the rest with 'xxxxx'.
 * Example:
 *   '+919876543210' -> '+91 98765xxxxx'
 *   '9876543210'    -> '98765xxxxx'
 */
export const maskPhoneNumber = (phone?: string | null): string => {
  if (!phone) return '-';
  const raw = phone.trim();

  // If phone has country code +91
  if (raw.startsWith('+91')) {
    const mobile = raw.slice(3).replace(/\D/g, '');
    if (mobile.length >= 5) {
      return `+91 ${mobile.slice(0, 5)}xxxxx`;
    }
    return `+91 ${mobile}xxxxx`;
  }

  // If phone has country code 91 without plus
  if (raw.startsWith('91') && raw.length > 10) {
    const mobile = raw.slice(2).replace(/\D/g, '');
    if (mobile.length >= 5) {
      return `+91 ${mobile.slice(0, 5)}xxxxx`;
    }
  }

  // Any other number format
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 5) {
    const prefix = raw.startsWith('+') ? '+' : '';
    return `${prefix}${digits.slice(0, 5)}xxxxx`;
  }

  return raw.length > 5 ? `${raw.slice(0, 5)}xxxxx` : raw;
};
