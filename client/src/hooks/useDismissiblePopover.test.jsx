import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useDismissiblePopover } from "./useDismissiblePopover.js";

function Popover({ name }) {
  const [open, setOpen] = useState(false);
  const ref = useDismissiblePopover(open, setOpen);
  return <div ref={ref}>
    <button onClick={() => setOpen(value => !value)} aria-expanded={open}>{name}</button>
    {open && <div role="region" aria-label={name}><button>Inside {name}</button></div>}
  </div>;
}
function mount() {
  render(<><Popover name="Profile" /><Popover name="Notifications" /><button>Outside</button></>);
}
afterEach(cleanup);

describe("Header popover dismissal", () => {
  it("dismisses on an outside pointer press, including touch", () => {
    mount();
    fireEvent.click(screen.getByText("Profile"));
    fireEvent.pointerDown(screen.getByText("Outside"), { pointerType: "touch" });
    expect(screen.queryByRole("region", { name: "Profile" })).toBeNull();
  });
  it("keeps internal controls usable and toggles closed from the trigger", () => {
    mount();
    fireEvent.click(screen.getByText("Notifications"));
    fireEvent.pointerDown(screen.getByText("Inside Notifications"));
    expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeNull();
    fireEvent.click(screen.getByText("Notifications"));
    expect(screen.queryByRole("region", { name: "Notifications" })).toBeNull();
  });
  it("closes the previous popup when opening the other", () => {
    mount();
    fireEvent.click(screen.getByText("Profile"));
    fireEvent.pointerDown(screen.getByText("Notifications"));
    fireEvent.click(screen.getByText("Notifications"));
    expect(screen.queryByRole("region", { name: "Profile" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeNull();
  });
  it("closes on Escape and restores focus to the trigger", () => {
    mount();
    fireEvent.click(screen.getByText("Profile"));
    screen.getByText("Inside Profile").focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Profile" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("Profile"));
  });
  it("closes when keyboard focus leaves the popup", () => {
    mount();
    fireEvent.click(screen.getByText("Notifications"));
    fireEvent.focusIn(screen.getByText("Outside"));
    expect(screen.queryByRole("region", { name: "Notifications" })).toBeNull();
  });
});
