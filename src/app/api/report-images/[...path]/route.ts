import { createClient } from "@/lib/supabase/server";

const imageTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const objectPath = path.join("/");
  if (!/^users\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(objectPath)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) return new Response("Unable to verify account", { status: 500 });
  if (!user) return new Response("Authentication required", { status: 401 });

  const { data: isCampusMember, error: membershipError } = await supabase.rpc("current_user_is_campus_member");
  if (membershipError) return new Response("Unable to verify campus membership", { status: 500 });
  if (!isCampusMember) return new Response("Forbidden", { status: 403 });

  const { data: file, error } = await supabase.storage.from("item-images").download(objectPath);
  if (error || !file) return new Response("Not found", { status: 404 });

  const extension = (objectPath.split(".").at(-1) ?? "").toLowerCase();
  return new Response(file, {
    headers: {
      "Content-Type": imageTypes[extension],
      "Content-Length": String(file.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
