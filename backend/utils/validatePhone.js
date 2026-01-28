/**
 * Validates a phone number
 * @param {string} phone - The phone number to validate
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, message: 'Phone number is required' };
  }

  // Remove any whitespace
  const cleanPhone = phone.toString().trim();

  // Check if it's exactly 10 digits and contains only numbers
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return {
      isValid: false,
      message: 'Phone number must be exactly 10 digits and contain only numbers'
    };
  }

  return { isValid: true, message: '' };
};
