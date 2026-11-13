import type { Metadata } from "next";
import { AdminDashboard, AdminLogin } from "@/components/admin-panel";
import { SiteHeader } from "@/components/site-header";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Админ" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const configured = hasSupabasePublicConfig();
  let access: "login" | "admin" | "unauthorized" | "setup" = "setup";
  let email = "";

  if (configured) {
    const supabase = await createServerSupabaseClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const subject = claimsData?.claims?.sub;
    email = typeof claimsData?.claims?.email === "string" ? claimsData.claims.email : "";

    if (!subject) {
      access = "login";
    } else {
      const { data: isAdmin, error } = await supabase.rpc("is_admin");
      access = !error && isAdmin ? "admin" : "unauthorized";
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="admin-wrap page-width">
        {access === "setup" ? (
          <section className="admin-card" role="status">
            <p className="eyebrow">Ochir Couture</p>
            <h1>Админ нэвтрэх</h1>
            <p>Энэ орчинд Supabase тохиргоо алга. <span className="inline-code">.env.local</span>-ийг тохируулаад хуудсыг дахин нээнэ үү.</p>
          </section>
        ) : access === "login" ? (
          <AdminLogin />
        ) : access === "unauthorized" ? (
          <section className="admin-card" role="alert">
            <p className="eyebrow">Ochir Couture</p>
            <h1>Админ эрх шаардлагатай</h1>
            <p>Энэ бүртгэлд админ эрх олгогдоогүй байна. Админ хүснэгтэд бүртгэлтэй хэрэглэгчээр нэвтэрнэ үү.</p>
          </section>
        ) : (
          <AdminDashboard email={email} />
        )}
      </main>
    </>
  );
}
