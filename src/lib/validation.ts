import { z } from "zod";

const reportFields = {
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().trim().min(10, "Add a useful description (10+ characters)").max(1000),
  category_id: z.coerce.number().int().positive(),
  private_details: z.string().trim().max(1000).default(""),
};

export const reportTypeSchema = z.enum(["lost", "found"]);
export const reportImageSchema = z.union([z.instanceof(File), z.null()])
  .refine((file) => file === null || file.size === 0 || file.size <= 3 * 1024 * 1024, "Image must be under 3 MB")
  .refine(
    (file) => file === null || file.size === 0 || ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    "Image must be JPG, PNG, or WebP",
  );

export const claimSchema = z.object({
  found_notice_id: z.string().uuid(),
  lost_report_id: z.union([z.literal(""), z.string().uuid()]).transform((value) => value || null),
  evidence: z.string().trim().min(10, "Describe proof of ownership (10+ characters)").max(2000),
});

const optionalDate = z.union([z.literal(""), z.iso.date()]).transform((value) => value || null);
const optionalLocation = z.string().trim().max(120).transform((value) => value || null);

export const lostReportSchema = z.object({
  ...reportFields,
  last_seen_on: optionalDate,
  last_seen_location: optionalLocation,
});

export const foundNoticeSchema = z.object({
  ...reportFields,
  found_at_on: optionalDate,
  found_at_location: optionalLocation,
});

export const updateLostReportSchema = lostReportSchema.extend({
  report_id: z.string().uuid(),
});

export const updateFoundNoticeSchema = foundNoticeSchema.extend({
  report_id: z.string().uuid(),
});

export const reportIdSchema = z.string().uuid();

export const claimIdSchema = z.object({
  claim_id: z.string().uuid(),
  decision: z.enum(["needs_info", "approved", "rejected"]),
  message: z.string().trim().max(2000).optional(),
}).refine(
  (value) => value.decision !== "needs_info" || Boolean(value.message),
  { message: "Add the information requested from the claimant.", path: ["message"] },
);

export const handoverSchema = z.object({
  claim_id: z.string().uuid(),
  notes: z.string().trim().max(1000).optional(),
});

export const claimResponseSchema = z.object({
  claim_id: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
});

export const reservationReleaseSchema = z.object({
  claim_id: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
});

export const staleReportSchema = z.object({
  report_id: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
});

export const dispositionSchema = z.object({
  notice_id: z.string().uuid(),
  outcome: z.string().trim().min(1).max(1000),
});

export const categorySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2).max(60),
});

export const duplicateNoticeSchema = z.object({
  notice_id: z.string().uuid(),
  canonical_id: z.string().uuid(),
});

export const possibleMatchSchema = z.object({
  found_notice_id: z.string().uuid(),
  lost_report_id: z.string().uuid(),
});

export const adminAppointmentSchema = z.object({
  user_id: z.string().uuid(),
});

export const authSchema = z.object({
  mode: z.enum(["login", "signup"]),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().trim().min(2).optional(),
});

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];