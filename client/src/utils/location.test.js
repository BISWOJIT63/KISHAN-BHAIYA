import { describe, expect, it } from "vitest";
import { coordinateLabel, distanceKm } from "./location.js";

describe("market location detection", () => {
  it("preserves exact GPS coordinates instead of forcing an Odisha city", () => {
    expect(coordinateLabel(12.9716, 77.5946)).toBe("GPS 12.97160, 77.59460");
  });

  it("reports zero distance at a configured market location", () => {
    expect(distanceKm(
      { latitude: 20.2961, longitude: 85.8245 },
      { latitude: 20.2961, longitude: 85.8245 },
    )).toBe(0);
  });
});
