import { describe, it, expect } from "vitest";
import { add } from "./utils.js";

describe("add function", () => {
  it("should correctly add two positive numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("should correctly add a positive and a negative number", () => {
    expect(add(5, -3)).toBe(2);
  });

  it("should correctly add two negative numbers", () => {
    expect(add(-2, -4)).toBe(-6);
  });

  it("should return zero when adding zero to zero", () => {
    expect(add(0, 0)).toBe(0);
  });
});
