// Jest setup file
import * as dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });
dotenv.config({ path: ".env.local" });
dotenv.config();

// Global test setup
beforeAll(() => {
  // Setup code that runs before all tests
});

afterAll(() => {
  // Cleanup code that runs after all tests
});
