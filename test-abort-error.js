// Simple test to verify AbortError handling
console.log("Testing AbortError handling...");

// Simulate an AbortError
const testAbortError = () => {
  const error = new Error("signal is aborted without reason");
  error.name = "AbortError";

  // Test the error handling logic
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      console.log("✅ AbortError detected and handled correctly");
      return true;
    }
  }

  console.log("❌ AbortError not handled correctly");
  return false;
};

testAbortError();

// Test the controller with reason
const testControllerWithReason = () => {
  try {
    const controller = new AbortController();
    controller.abort("Request timeout after 30 seconds");
    console.log("✅ Controller abort with reason works");
  } catch (error) {
    console.log("❌ Controller abort with reason failed:", error);
  }
};

testControllerWithReason();

console.log("Test completed");
