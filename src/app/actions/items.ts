"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  adminAppointmentSchema,
  categorySchema,
  claimIdSchema,
  claimResponseSchema,
  claimSchema,
  dispositionSchema,
  duplicateNoticeSchema,
  foundNoticeSchema,
  handoverSchema,
  lostReportSchema,
  possibleMatchSchema,
  reservationReleaseSchema,
  reportImageSchema,
  reportTypeSchema,
  staleReportSchema,
  updateFoundNoticeSchema,
  updateLostReportSchema,
} from "@/lib/validation";

type State = { error?: string } | undefined;

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function messageFrom(error: { message: string } | null, fallback: string) {
  return error ? fallback : undefined;
}

export async function createReport(_: State, formData: FormData): Promise<State> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsedType = reportTypeSchema.safeParse(formData.get("type"));
  if (!parsedType.success) return { error: "Choose a valid report type." };
  const isFound = parsedType.data === "found";
  const values = Object.fromEntries(formData);
  const foundData = isFound ? foundNoticeSchema.safeParse(values) : null;
  const lostData = isFound ? null : lostReportSchema.safeParse(values);
  if (foundData && !foundData.success) return { error: foundData.error.issues[0].message };
  if (lostData && !lostData.success) return { error: lostData.error.issues[0].message };

  const membership = await supabase.rpc("current_user_is_campus_member");
  if (membership.error) return { error: "Could not verify campus account" };
  if (!membership.data) return { error: "A verified campus account is required" };

  const reportId = crypto.randomUUID();
  const parsedImage = reportImageSchema.safeParse(formData.get("image"));
  if (!parsedImage.success) return { error: parsedImage.error.issues[0].message };
  const file = parsedImage.data;
  let imagePath: string | null = null;
  if (file && file.size > 0) {
    const extension = imageExtensions[file.type];
    if (!extension) return { error: "Image type was not accepted." };
    imagePath = `users/${user.id}/${reportId}.${extension}`;
    const { error } = await supabase.storage.from("item-images").upload(imagePath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return { error: "Image upload failed. The report was not created." };
  }

  let createError: { message: string } | null = null;
  if (foundData?.success) {
    const { error } = await supabase.rpc("create_found_notice", {
        notice_id: reportId,
        notice_title: foundData.data.title,
        notice_description: foundData.data.description,
        notice_category_id: foundData.data.category_id,
        found_on: foundData.data.found_at_on,
        found_location: foundData.data.found_at_location,
        private_details: foundData.data.private_details,
        report_image_path: imagePath,
    });
    createError = error;
  } else if (lostData?.success) {
    const { error } = await supabase.rpc("create_lost_report", {
        report_id: reportId,
        report_title: lostData.data.title,
        report_description: lostData.data.description,
        report_category_id: lostData.data.category_id,
        seen_on: lostData.data.last_seen_on,
        seen_location: lostData.data.last_seen_location,
        private_details: lostData.data.private_details,
        report_image_path: imagePath,
      });
    createError = error;
  } else {
    return { error: "Could not validate report." };
  }

  if (createError) {
    if (imagePath) {
      const { error: cleanupError } = await supabase.storage.from("item-images").remove([imagePath]);
      if (cleanupError) return { error: "Report creation failed and its uploaded image could not be removed." };
    }
    return { error: "Could not create report. Check your category and account permissions." };
  }

  revalidatePath("/items");
  redirect(`/items/${reportId}`);
}

export async function submitClaim(_: State, formData: FormData): Promise<State> {
  const parsed = claimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("claimant_create_claim", {
    notice_id: parsed.data.found_notice_id,
    report_id: parsed.data.lost_report_id,
    proof: parsed.data.evidence,
  });
  if (error) return { error: "Could not submit claim. Confirm the item is at the desk and try again." };

  revalidatePath(`/items/${parsed.data.found_notice_id}`);
  revalidatePath("/admin");
  return {};
}

export async function reviewClaim(formData: FormData): Promise<void> {
  const parsed = claimIdSchema.safeParse({
    claim_id: formData.get("claim_id"),
    decision: formData.get("decision"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("admin_review_claim", {
    claim_id: parsed.data.claim_id,
    decision: parsed.data.decision,
    message: parsed.data.message,
  });
  if (error) throw new Error("Claim review failed. Verify admin access and the claim state.");
  revalidatePath("/admin");
  revalidatePath("/items");
}

export async function respondToClaim(formData: FormData): Promise<void> {
  const parsed = claimResponseSchema.safeParse({
    claim_id: formData.get("claim_id"),
    message: formData.get("message"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("claimant_respond_to_claim", parsed.data);
  if (error) throw new Error("Could not add claim information.");
  revalidatePath("/items");
  revalidatePath("/admin");
}

export async function withdrawClaim(formData: FormData): Promise<void> {
  const parsed = claimIdSchema.shape.claim_id.safeParse(formData.get("claim_id"));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("claimant_withdraw_claim", { claim_id: parsed.data });
  if (error) throw new Error("Could not withdraw claim. It may already be completed.");
  revalidatePath("/items");
  revalidatePath("/admin");
}

export async function receiveFoundNotice(formData: FormData): Promise<void> {
  const parsed = claimIdSchema.shape.claim_id.safeParse(formData.get("notice_id"));
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("admin_receive_found_notice", { notice_id: parsed.data });
  if (error) throw new Error("Could not record desk receipt. Verify admin access and notice state.");
  revalidatePath("/admin");
  revalidatePath("/items");
}

export async function recordHandover(formData: FormData): Promise<void> {
  const parsed = handoverSchema.safeParse({
    claim_id: formData.get("claim_id"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("admin_record_handover", parsed.data);
  if (error) throw new Error("Could not record handover. Verify the item is reserved and pickup is complete.");
  revalidatePath("/admin");
  revalidatePath("/items");
}

export async function releaseReservation(formData: FormData): Promise<void> {
  const parsed = reservationReleaseSchema.safeParse({
    claim_id: formData.get("claim_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("admin_release_reservation", parsed.data);
  if (error) throw new Error("Could not release reservation.");
  revalidatePath("/admin");
  revalidatePath("/items");
}

export async function withdrawReport(formData: FormData): Promise<void> {
  const kind = formData.get("kind");
  const id = claimIdSchema.shape.claim_id.safeParse(formData.get("report_id"));
  if (!id.success || (kind !== "lost" && kind !== "found")) throw new Error("Invalid report.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = kind === "lost"
    ? await supabase.rpc("owner_withdraw_lost_report", { report_id: id.data })
    : await supabase.rpc("owner_withdraw_found_notice", { notice_id: id.data });
  if (error) throw new Error("Could not withdraw report. Only open reports you own can be withdrawn.");
  revalidatePath("/items");
  revalidatePath(`/items/${id.data}`);
}

export async function updateReport(formData: FormData): Promise<void> {
  const parsedType = reportTypeSchema.safeParse(formData.get("kind"));
  if (!parsedType.success) throw new Error("Invalid report type.");
  const values = Object.fromEntries(formData);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let reportId: string;
  if (parsedType.data === "lost") {
    const parsed = updateLostReportSchema.safeParse(values);
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    reportId = parsed.data.report_id;
    const { error } = await supabase.rpc("owner_update_lost_report", {
      report_id: parsed.data.report_id,
      report_title: parsed.data.title,
      report_description: parsed.data.description,
      report_category_id: parsed.data.category_id,
      seen_on: parsed.data.last_seen_on,
      seen_location: parsed.data.last_seen_location,
      private_details: parsed.data.private_details,
    });
    if (error) throw new Error("Could not update report. It may no longer be editable.");
  } else {
    const parsed = updateFoundNoticeSchema.safeParse(values);
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    reportId = parsed.data.report_id;
    const { error } = await supabase.rpc("owner_update_found_notice", {
      notice_id: parsed.data.report_id,
      notice_title: parsed.data.title,
      notice_description: parsed.data.description,
      notice_category_id: parsed.data.category_id,
      found_on: parsed.data.found_at_on,
      found_location: parsed.data.found_at_location,
      private_details: parsed.data.private_details,
    });
    if (error) throw new Error("Could not update report. It may no longer be editable.");
  }
  revalidatePath("/items");
  revalidatePath(`/items/${reportId}`);
}

export async function createPossibleMatch(formData: FormData): Promise<void> {
  const parsed = possibleMatchSchema.safeParse({
    found_notice_id: formData.get("found_notice_id"),
    lost_report_id: formData.get("lost_report_id"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("possible_matches").insert({
    ...parsed.data,
    created_by: user.id,
  });
  if (error && error.code !== "23505") throw new Error("Could not record possible match.");
  revalidatePath("/admin");
}

export async function closeStaleLostReport(formData: FormData): Promise<void> {
  const parsed = staleReportSchema.safeParse({
    report_id: formData.get("report_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("admin_close_stale_lost_report", parsed.data);
  if (error) throw new Error("Could not close stale report. Contact the owner and record the reason.");
  revalidatePath("/admin");
  revalidatePath("/items");
}

export async function disposeFoundNotice(formData: FormData): Promise<void> {
  const parsed = dispositionSchema.safeParse({
    notice_id: formData.get("notice_id"),
    outcome: formData.get("outcome"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("admin_dispose_found_notice", parsed.data);
  if (error) throw new Error("Could not record disposition. Reservations must be released first.");
  revalidatePath("/admin");
  revalidatePath("/items");
}

export async function markDuplicateNotice(formData: FormData): Promise<void> {
  const parsed = duplicateNoticeSchema.safeParse({
    notice_id: formData.get("notice_id"),
    canonical_id: formData.get("canonical_id"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("admin_mark_duplicate_notice", parsed.data);
  if (error) throw new Error("Could not mark duplicate notice.");
  revalidatePath("/admin");
  revalidatePath("/items");
}

export async function appointAdmin(formData: FormData): Promise<void> {
  const parsed = adminAppointmentSchema.safeParse({ user_id: formData.get("user_id") });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("admin_appoint_admin", parsed.data);
  if (error) throw new Error("Could not appoint admin. Verify the user is a student and you are an admin.");
  revalidatePath("/admin");
}

export async function saveCategory(formData: FormData): Promise<void> {
  const parsed = categorySchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = parsed.data.id
    ? await supabase.from("categories").update({ name: parsed.data.name }).eq("id", parsed.data.id)
    : await supabase.from("categories").insert({ name: parsed.data.name });
  const errorMessage = messageFrom(result.error, "Could not save category.");
  if (errorMessage) throw new Error(errorMessage);
  revalidatePath("/items/new");
  revalidatePath("/admin");
}
