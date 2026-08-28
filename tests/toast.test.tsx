import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GlobalToast } from "@/components/GlobalToast";
import { showToast } from "@/lib/toast";

describe("global confirmation toast", () => {
  it("survives page content changes and displays the reply receipt", async () => {
    const user = userEvent.setup();
    render(<GlobalToast />);

    showToast({
      title: "Reply posted successfully",
      message: "Comment ID: t1_receipt",
      url: "https://reddit.com/reply/t1_receipt",
    });

    expect(await screen.findByText("Reply posted successfully")).toBeInTheDocument();
    expect(screen.getByText("Comment ID: t1_receipt")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view reply/i })).toHaveAttribute(
      "href",
      "https://reddit.com/reply/t1_receipt",
    );
    await user.click(screen.getByRole("button", { name: "Dismiss confirmation" }));
    expect(screen.queryByText("Reply posted successfully")).not.toBeInTheDocument();
  });
});
