import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UserAvatar from "./UserAvatar.jsx";

describe("UserAvatar", () => {
  it("shows initials until a profile image is available", () => {
    const { rerender } = render(<UserAvatar user={{ name: "Mahesh Nayak" }} />);
    expect(screen.getByLabelText("Mahesh Nayak initials")).toHaveTextContent("MN");

    rerender(<UserAvatar user={{ name: "Mahesh Nayak", profileImage: "/uploads/profile.png" }} />);
    expect(screen.getByRole("img", { name: "Mahesh Nayak profile" })).toHaveAttribute("src", "/uploads/profile.png");
  });
});
