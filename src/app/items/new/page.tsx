import { createClient } from "@/lib/supabase/server";
import ReportForm from "./ReportForm";

export default async function NewReportPage() {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id,name")
    .eq("active", true)
    .order("name");

  if (error) throw new Error("Could not load report categories.");

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-2xl font-bold">Report lost or found property</h1>
      <ReportForm categories={categories ?? []} />
    </main>
  );
}
