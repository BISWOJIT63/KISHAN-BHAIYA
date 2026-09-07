import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../store/useAppStore.js";
import CheckoutPage from "./CheckoutPage.jsx";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("../api/client.js", () => ({
  api: { post: mocks.post },
  apiError: (error) => error.message,
  getData: (promise) => promise,
}));

describe("checkout submission", () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({ _id: "order-test" });
    useAppStore.setState({
      user: { _id: "consumer-test", role: "consumer", name: "Test Buyer" },
      cart: [
        {
          productId: "prod-test",
          name: "Fresh Tomato",
          image: "",
          price: 30,
          bulkPrice: 25,
          bulkThreshold: 100,
          availableQuantity: 50,
          quantity: 2,
          unit: "kg",
        },
      ],
    });
  });

  it("places one order when the submit button is clicked", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/checkout"]}>
          <CheckoutPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /place order/i }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(mocks.post).toHaveBeenCalledWith(
      "/orders",
      expect.objectContaining({
        items: [{ productId: "prod-test", quantity: 2 }],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": expect.any(String) }),
      }),
    );
  });
});
