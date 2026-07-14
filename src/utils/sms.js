const { sendRawSMS } = require("./eskiz");

/**
 * Normalizes and formats Uzbek phone numbers to 998XXXXXXXXX format.
 * Examples:
 * - 998901234567 -> 998901234567
 * - +998901234567 -> 998901234567
 * - 90 1234567 -> 998901234567
 * - 901234567 -> 998901234567
 * 
 * @param {string} phone - The raw phone number input.
 * @returns {string} Normalized 12-digit phone number, or empty string if invalid.
 */
function formatPhoneNumber(phone) {
  if (!phone) return "";
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  
  // If it is 9 digits, prepend the country code 998
  if (cleaned.length === 9) {
    cleaned = "998" + cleaned;
  }
  
  return cleaned;
}

/**
 * Formats a phone number and sends an SMS.
 * Safe method: will never throw an exception or interrupt core logic.
 * 
 * @param {string} rawPhone - Recipient phone number
 * @param {string} message - Message body
 * @returns {Promise<boolean>} True if sent successfully, false otherwise
 */
async function sendSMS(rawPhone, message) {
  try {
    const formattedPhone = formatPhoneNumber(rawPhone);
    
    if (!formattedPhone || formattedPhone.length !== 12) {
      console.error(`[SMS Helper] Failed to send SMS: Normalized phone number is invalid ("${rawPhone}" -> "${formattedPhone}")`);
      return false;
    }

    console.log(`[SMS Helper] Preparing to send SMS to: ${formattedPhone}`);
    const result = await sendRawSMS(formattedPhone, message);
    console.log(`[SMS Helper] SMS successfully sent to ${formattedPhone}. Response:`, result);
    return true;
  } catch (error) {
    // "SMS yuborilmasa: Booking bekor bo'lmasin. API 500 qaytarmasin. Faqat console.error() yoki logger orqali log yozilsin."
    console.error(`[SMS Helper] FAILED to send SMS to "${rawPhone}":`, error.message);
    return false;
  }
}

module.exports = {
  formatPhoneNumber,
  sendSMS
};
