import { describe, it, expect } from "vitest";
import {
  claimSchema,
  claimIdSchema,
  foundNoticeSchema,
  lostReportSchema,
  reportImageSchema,
} from "./validation";

describe("claimSchema", () => {
  it("rejects a vague message", () =>
    expect(claimSchema.safeParse({
      found_notice_id: crypto.randomUUID(),
      lost_report_id: "",
      evidence: "mine",
    }).success).toBe(false));

  it("accepts private evidence with an optional lost report", () =>
    expect(claimSchema.safeParse({
      found_notice_id: crypto.randomUUID(),
      lost_report_id: "",
      evidence: "There is a small tear inside the left pocket",
    }).success).toBe(true));
});

describe("claimIdSchema", () => {
  it("requires a private message when requesting more information", () => {
    expect(claimIdSchema.safeParse({
      claim_id: crypto.randomUUID(),
      decision: "needs_info",
    }).success).toBe(false);
  });
});

describe("lostReportSchema", () => {
  const valid = {
    title: "Black wallet",
    description: "Small black leather wallet with a zipper",
    category_id: "2",
    last_seen_on: "",
    last_seen_location: "",
  };

  it("accepts a useful report without an exact date or location", () => {
    expect(lostReportSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a useful description", () => {
    expect(lostReportSchema.safeParse({ ...valid, description: "wallet" }).success).toBe(false);
  });
});

describe("foundNoticeSchema", () => {
  const valid = {
    title: "Blue water bottle",
    description: "Blue bottle with a silver cap",
    category_id: "7",
    found_at_on: "",
    found_at_location: "",
  };

  it("accepts approximate or unknown discovery details", () => {
    expect(foundNoticeSchema.safeParse(valid).success).toBe(true);
  });

  describe("reportImageSchema", () => {
    it("accepts supported image uploads", () => {
      expect(reportImageSchema.safeParse(new File(["photo"], "item.png", { type: "image/png" })).success).toBe(true);
    });

    it("rejects non-image formats", () => {
      expect(reportImageSchema.safeParse(new File(["document"], "item.pdf", { type: "application/pdf" })).success).toBe(false);
    });
  });

  it("rejects malformed dates", () => {
    expect(foundNoticeSchema.safeParse({ ...valid, found_at_on: "yesterday" }).success).toBe(false);
  });
});