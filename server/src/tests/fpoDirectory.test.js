import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { store } from "../services/dataStore.js";
import { demoPassword } from "../seed/data.js";

beforeAll(async () => store.initialize("memory"));

describe("nearby FPO directory", () => {
  const app = createApp();
  let farmerToken;

  beforeAll(async () => {
    const login = await request(app).post("/api/v1/auth/login").send({
      identifier: "farmer@kishanbhaiya.demo",
      password: demoPassword,
    });
    farmerToken = login.body.data.accessToken;
  });

  it("ranks FPOs from device coordinates and returns directory contacts", async () => {
    const response = await request(app)
      .get("/api/v1/fpos?latitude=19.8135&longitude=85.8315")
      .set("Authorization", `Bearer ${farmerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.origin).toEqual(
      expect.objectContaining({
        source: "DEVICE",
        coordinates: [85.8315, 19.8135],
      }),
    );
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        fpoId: "seller-3",
        name: "Maa Mangala Growers",
        distanceKm: 0,
        contactName: "Pratima Mohanty",
        phone: "9876501021",
        email: "contact@maamangala.demo",
        acceptingMembers: true,
      }),
    );
    expect(response.body.data.every((fpo) => Array.isArray(fpo.coordinates))).toBe(
      true,
    );
  });

  it("uses the farmer's saved farm location when GPS is not supplied", async () => {
    const response = await request(app)
      .get("/api/v1/fpos")
      .set("Authorization", `Bearer ${farmerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.origin).toEqual(
      expect.objectContaining({ source: "SAVED_FARM", label: "Khordha" }),
    );
    expect(response.body.data[0].fpoId).toBe("seller-2");
  });

  it("rejects incomplete or out-of-India coordinates", async () => {
    const [incomplete, outside] = await Promise.all([
      request(app)
        .get("/api/v1/fpos?latitude=20.2")
        .set("Authorization", `Bearer ${farmerToken}`),
      request(app)
        .get("/api/v1/fpos?latitude=1.3521&longitude=103.8198")
        .set("Authorization", `Bearer ${farmerToken}`),
    ]);

    expect(incomplete.status).toBe(400);
    expect(outside.status).toBe(400);
  });
});
