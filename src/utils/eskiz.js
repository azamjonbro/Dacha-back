const axios = require("axios");
const config = require("../config/sms.config");

let cachedToken = null;

/**
 * Logs in to Eskiz SMS API and updates the cached token.
 * @returns {Promise<string>} The new token.
 */
async function getNewToken() {
  try {
    const url = `${config.baseUrl}/auth/login`;
    console.log(`[ESKIZ API] Authenticating with Eskiz at ${url}...`);
    
    const response = await axios.post(url, {
      email: config.email,
      password: config.password
    });

    if (response.data && response.data.data && response.data.data.token) {
      cachedToken = response.data.data.token;
      console.log("[ESKIZ API] Authentication successful, token updated.");
      return cachedToken;
    }
    
    throw new Error("Token was not found in the response payload structure.");
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("[ESKIZ API] Authentication failed:", errorMsg);
    throw new Error(`Eskiz authentication failed: ${errorMsg}`);
  }
}

/**
 * Sends a raw SMS request to Eskiz API.
 * Handles automatic token retrieval and automatic retry on authorization failure (e.g. token expired).
 * 
 * @param {string} phone - Recipient phone number in international format without plus (e.g. 998901234567)
 * @param {string} message - SMS message content
 * @param {boolean} isRetry - internal flag to prevent infinite loops on authorization failure
 * @returns {Promise<any>} Response data from Eskiz API
 */
async function sendRawSMS(phone, message, isRetry = false) {
  if (!config.email || !config.password) {
    throw new Error("Eskiz credentials (ESKIZ_EMAIL, ESKIZ_PASSWORD) are not configured in .env");
  }

  // 1. Get token if not cached
  if (!cachedToken) {
    console.log("[ESKIZ API] No cached token found, requesting new token...");
    await getNewToken();
  }

  const url = `${config.baseUrl}/message/sms/send`;
  
  try {
    console.log(`[ESKIZ API] Sending SMS to ${phone}...`);
    const response = await axios.post(
      url,
      {
        mobile_phone: phone,
        message: message,
        from: config.from
      },
      {
        headers: {
          Authorization: `Bearer ${cachedToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    const status = error.response ? error.response.status : null;
    const isUnauthorized = status === 401 || status === 403;
    
    // Check if response contains token/auth error keywords
    const responseString = error.response ? JSON.stringify(error.response.data).toLowerCase() : "";
    const hasTokenError = responseString.includes("token") || responseString.includes("unauthorized") || responseString.includes("expired");

    // 2. If unauthorized and not already retried, refresh token and retry
    if ((isUnauthorized || hasTokenError) && !isRetry) {
      console.warn("[ESKIZ API] Token is invalid or expired. Refreshing token and retrying send...");
      try {
        await getNewToken();
        // Retry with the refreshed token
        return await sendRawSMS(phone, message, true);
      } catch (retryError) {
        console.error("[ESKIZ API] Retry failed after token refresh:", retryError.message);
        throw retryError;
      }
    }

    // Otherwise, throw the error
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Eskiz send raw SMS failed: ${errorMsg}`);
  }
}

module.exports = {
  sendRawSMS,
  getNewToken
};
