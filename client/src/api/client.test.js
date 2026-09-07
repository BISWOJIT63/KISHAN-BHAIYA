import { describe, expect, it } from "vitest";
import { apiError, getData } from "./client.js";

describe("API response handling", () => {
  it("unwraps the standard API response", async () => {
    await expect(
      getData(
        Promise.resolve({
          data: { success: true, data: { id: "order-1" } },
          headers: { "content-type": "application/json" },
        }),
      ),
    ).resolves.toEqual({ id: "order-1" });
  });

  it("reports a missing Vercel API connection instead of accepting HTML", async () => {
    await expect(
      getData(
        Promise.resolve({
          data: "<!doctype html><html></html>",
          headers: { "content-type": "text/html" },
        }),
      ),
    ).rejects.toThrow("VITE_API_URL");
  });

  it("shows the first server-side field validation error", () => {
    expect(
      apiError({
        response: {
          data: {
            error: {
              message: "Please check the submitted fields",
              details: { fieldErrors: { quantity: ["Enter a quantity"] } },
            },
          },
        },
      }),
    ).toBe("Enter a quantity");
  });
});
