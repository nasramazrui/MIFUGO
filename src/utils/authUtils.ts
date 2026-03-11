/**
 * Utility to handle phone or email as a login identifier.
 * If the identifier is a phone number, it converts it to a virtual email for Firebase Auth.
 */
export const getAuthEmail = (identifier: string): string => {
  const trimmed = identifier.trim().toLowerCase();
  
  // Basic check for email
  if (trimmed.includes('@')) {
    return trimmed;
  }
  
  // If it's a phone number (digits only, maybe starting with +)
  // Remove any non-digit characters
  const digits = trimmed.replace(/\D/g, '');
  
  if (digits.length >= 9) {
    // Normalize to a consistent format if needed, but for now just use the digits
    return `${digits}@kukuapp.internal`;
  }
  
  return trimmed;
};

export const isEmail = (identifier: string): boolean => {
  return identifier.includes('@');
};
