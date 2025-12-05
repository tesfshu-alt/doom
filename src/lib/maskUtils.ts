/**
 * Mask phone number showing first 3 and last 2 digits
 * Example: "0912345678" -> "091****78"
 */
export const maskPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return 'Unknown';
  if (phone.length < 6) return phone;
  const start = phone.slice(0, 3);
  const end = phone.slice(-2);
  return `${start}****${end}`;
};

/**
 * Mask account number showing first 4 and last 4 digits
 * Example: "1234567890123" -> "1234****0123"
 */
export const maskAccountNumber = (account: string | null | undefined): string => {
  if (!account) return 'Unknown';
  if (account.length <= 8) return account;
  const start = account.slice(0, 4);
  const end = account.slice(-4);
  return `${start}****${end}`;
};
