import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsPage } from "@/components/ProductsPage";
import { seedProducts } from "@/lib/seed";

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(seedProducts))) as typeof fetch;
});

describe("product configuration", () => {
  it("co-locates URL prefix with URL and preserves its value while editing", async () => {
    const user = userEvent.setup();
    render(<ProductsPage />);
    await user.click(await screen.findByRole("button", { name: /ReelBlocks/i }));

    const url = screen.getByLabelText("URL");
    const prefix = screen.getByLabelText("URL prefix");
    expect(url).toHaveValue(seedProducts[0].url);
    expect(prefix).toHaveValue(seedProducts[0].must_include);
    expect(url.closest(".url-fields")).toBe(prefix.closest(".url-fields"));
    expect(within(url.closest(".url-fields")!).queryByText("Must include")).not.toBeInTheDocument();
  });
});
