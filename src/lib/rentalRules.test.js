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
});