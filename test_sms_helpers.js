const assert = require("assert");

// Mock axios behavior for testing token acquisition and token refreshing
const mockAxiosCalls = [];
const axiosMock = {
  post: async (url, body, config) => {
    mockAxiosCalls.push({ url, body, config });
    
    // Simulate Login endpoint
    if (url.includes("/auth/login")) {
      if (body.email === "test@eskiz.uz" && body.password === "correct-password") {
        return {
          data: {
            message: "success",
            data: {
              token: "mock-new-token-12345"
            }
          }
        };
      }
      throw new Error("Invalid credentials");
    }

    // Simulate SMS send endpoint
    if (url.includes("/message/sms/send")) {
      const authHeader = config && config.headers && config.headers.Authorization;
      if (!authHeader) {
        const err = new Error("Unauthorized");
        err.response = { status: 401, data: { message: "No Authorization header" } };
        throw err;
      }

      if (authHeader === "Bearer mock-expired-token") {
        const err = new Error("Token expired");
        err.response = { status: 401, data: { message: "Token has expired" } };
        throw err;
      }

      if (authHeader === "Bearer mock-new-token-12345") {
        return {
          data: {
            status: "waiting",
            message: "SMS is sent successfully"
          }
        };
      }

      const err = new Error("Forbidden");
      err.response = { status: 403, data: { message: "Invalid token" } };
      throw err;
    }

    throw new Error(`Unknown route: ${url}`);
  }
};

// Require our modules and run assertions
const { formatPhoneNumber } = require("./src/utils/sms");

function testPhoneFormatting() {
  console.log("Testing Phone Number Formatting...");
  
  const testCases = [
    { input: "998901234567", expected: "998901234567" },
    { input: "+998901234567", expected: "998901234567" },
    { input: "90 1234567", expected: "998901234567" },
    { input: "901234567", expected: "998901234567" },
    { input: "+998 (90) 123-45-67", expected: "998901234567" },
    { input: "90-123-45-67", expected: "998901234567" },
    { input: "", expected: "" },
    { input: null, expected: "" }
  ];

  for (const { input, expected } of testCases) {
    const output = formatPhoneNumber(input);
    assert.strictEqual(output, expected, `Failed for input: ${input}. Got "${output}", expected "${expected}"`);
  }
  
  console.log("✅ Phone Number Formatting Tests Passed!");
}

async function testEskizClient() {
  console.log("\nTesting Eskiz Token Management & Send Retry...");
  
  // Inject mock axios into our required module
  // To avoid polluting, we override the global/module level axios.
  // We can do this by using a proxy/mocking, or since eskiz.js requires axios,
  // we can temporarily override it in the module cache.
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (name) {
    if (name === "axios") {
      return axiosMock;
    }
    return originalRequire.apply(this, arguments);
  };

  // Set mock config env
  process.env.ESKIZ_EMAIL = "test@eskiz.uz";
  process.env.ESKIZ_PASSWORD = "correct-password";
  process.env.ESKIZ_FROM = "4546";
  process.env.ESKIZ_BASE_URL = "https://notify.eskiz.uz/api";

  // Re-require configurations and helpers so they pick up mocks
  delete require.cache[require.resolve("./src/config/sms.config")];
  delete require.cache[require.resolve("./src/utils/eskiz")];
  delete require.cache[require.resolve("./src/utils/sms")];

  const { sendRawSMS } = require("./src/utils/eskiz");
  const { sendSMS } = require("./src/utils/sms");

  // Test 1: Successful send when cachedToken is empty (should login first)
  console.log("Running Scenario 1: No cached token, should login and send SMS");
  mockAxiosCalls.length = 0;
  
  const result1 = await sendSMS("901234567", "Hello Test 1");
  assert.strictEqual(result1, true, "Scenario 1 sendSMS should return true");
  assert.strictEqual(mockAxiosCalls.length, 2, "Should make 2 API calls (login and send)");
  assert.strictEqual(mockAxiosCalls[0].url.endsWith("/auth/login"), true, "First call should be login");
  assert.strictEqual(mockAxiosCalls[1].url.endsWith("/message/sms/send"), true, "Second call should be send");
  assert.strictEqual(mockAxiosCalls[1].config.headers.Authorization, "Bearer mock-new-token-12345", "Should use new token");
  console.log("Scenario 1 Passed!");

  // Test 2: Token expiry retry. We force token to be expired, and verify it logins again and retries successfully.
  console.log("Running Scenario 2: Cached token expired (401), should login again and retry");
  mockAxiosCalls.length = 0;

  // Let's hack the internal cachedToken of eskiz module to be expired
  const eskizModule = require("./src/utils/eskiz");
  // We can't access module local variable directly, but it is in-memory.
  // Wait, since cachedToken is stored at module scope, we can import it and since it was set to "mock-new-token-12345" in Scenario 1,
  // we can simulate token expiry by changing the mock response to fail on this token.
  // Let's modify the mock to throw 401 on "mock-new-token-12345" and only accept "mock-new-token-revised" on login.
  // Let's just adjust the axiosMock dynamically.
  let returnExpired = true;
  axiosMock.post = async (url, body, config) => {
    mockAxiosCalls.push({ url, body, config });
    if (url.includes("/auth/login")) {
      return {
        data: {
          message: "success",
          data: {
            token: "mock-new-token-revised"
          }
        }
      };
    }
    if (url.includes("/message/sms/send")) {
      const authHeader = config.headers.Authorization;
      if (authHeader === "Bearer mock-new-token-12345") {
        if (returnExpired) {
          returnExpired = false; // Next time it won't be expired (simulating a login refresh)
          const err = new Error("Token expired");
          err.response = { status: 401, data: { message: "Token has expired" } };
          throw err;
        }
      }
      if (authHeader === "Bearer mock-new-token-revised") {
        return {
          data: {
            message: "SMS is sent successfully"
          }
        };
      }
      const err = new Error("Unauthorized");
      err.response = { status: 401, data: { message: "Unauthorized" } };
      throw err;
    }
  };

  const result2 = await sendSMS("901234567", "Hello Test 2");
  assert.strictEqual(result2, true, "Scenario 2 sendSMS should return true");
  
  // Sequence should be:
  // 1. Send SMS (using cached token mock-new-token-12345) -> returns 401
  // 2. Refresh Token (login) -> returns mock-new-token-revised
  // 3. Resend SMS (using mock-new-token-revised) -> success
  assert.strictEqual(mockAxiosCalls.length, 3, "Should make 3 API calls: send (fail), login (refresh), send (success)");
  assert.strictEqual(mockAxiosCalls[0].config.headers.Authorization, "Bearer mock-new-token-12345", "First send should use cached token");
  assert.strictEqual(mockAxiosCalls[1].url.endsWith("/auth/login"), true, "Second call should be login to refresh");
  assert.strictEqual(mockAxiosCalls[2].config.headers.Authorization, "Bearer mock-new-token-revised", "Third call should use refreshed token");
  
  console.log("Scenario 2 Passed!");
  console.log("✅ Eskiz Token Management & Send Retry Tests Passed!");
}

async function runAllTests() {
  try {
    testPhoneFormatting();
    await testEskizClient();
    console.log("\n⭐️ ALL TESTS COMPLETED SUCCESSFULLY! ⭐️");
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  }
}

runAllTests();
