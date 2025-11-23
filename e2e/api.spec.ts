import { test, expect } from "@playwright/test";

test.describe("API Routes", () => {
  test.describe("Unauthenticated requests", () => {
    test("GET /api/registries returns 401 without auth", async ({
      request,
    }) => {
      const response = await request.get("/api/registries");
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test("POST /api/registries returns 401 without auth", async ({
      request,
    }) => {
      const response = await request.post("/api/registries", {
        data: { title: "Test Registry" },
      });
      expect(response.status()).toBe(401);
    });

    test("GET /api/registries/:id returns 401 without auth", async ({
      request,
    }) => {
      const response = await request.get("/api/registries/some-id");
      expect(response.status()).toBe(401);
    });

    test("POST /api/items/:id/claim returns 401 without auth", async ({
      request,
    }) => {
      const response = await request.post("/api/items/some-id/claim");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Invite token validation", () => {
    test("POST /api/invite/accept with invalid token returns 400", async ({
      request,
    }) => {
      const response = await request.post("/api/invite/accept", {
        data: { token: "invalid-token" },
      });

      // Invalid token should return 400
      expect(response.status()).toBe(400);
    });

    test("GET /api/invite/accept without token returns 401 (requires auth)", async ({
      request,
    }) => {
      const response = await request.get("/api/invite/accept");
      // GET requires authentication
      expect(response.status()).toBe(401);
    });
  });
});
