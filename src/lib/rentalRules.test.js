import { describe, expect, test } from "bun:test";
import { inspectionFee, isAgentProfileComplete } from "./rentalRules";
describe("Inspection pricing", () => {
  test("One home is free", () => expect(inspectionFee(1)).toBe(0));
  test("Multiple homes cost a flat 3500 naira", () => {
    expect(inspectionFee(2)).toBe(3500);
    expect(inspectionFee(3)).toBe(3500);
    expect(inspectionFee(10)).toBe(3500);
  });
});
test("An agent needs name, phone, email, address and photo", () => {
  const profile = { full_name: "Test Agent", phone: "08030000000", email: "agent@example.com", home_address: "10 Test Road, Lagos", avatar_url: "https://example.com/photo.jpg" };
  expect(isAgentProfileComplete(profile)).toBe(true);
  for (const field of Object.keys(profile)) expect(isAgentProfileComplete({ ...profile, [field]: "" })).toBe(false);
  expect(isAgentProfileComplete({ ...profile, phone: "bad" })).toBe(false);
});test("Single room is a listing category", async () => {
  const { PROPERTY_TYPES } = await import("./rentalRules");
  expect(PROPERTY_TYPES).toContain("Single room");
});
test("Receipt ID is a stable betterhouse ID", async () => {
  const { receiptId } = await import("./rentalRules");
  expect(receiptId("1ff696be-2053-4114-9595-c26ec1f36f30")).toBe("BH-1FF696BE20");
});
test("Calendar event lasts one hour from the inspection time", async () => {
  const { inspectionEvent } = await import("./rentalRules");
  const e = inspectionEvent("Room", "Yaba", new Date("2026-11-01T10:00:00Z"));
  expect(e.google).toContain("dates=20261101T100000Z/20261101T110000Z");
});
