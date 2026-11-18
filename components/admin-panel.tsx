"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, CATEGORY_LABELS, STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { Order, OrderStatus, Product } from "@/lib/database.types";
import { formatSizeBreakdown } from "@/lib/order-sizes";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Feedback = { tone: "success" | "error"; message: string } | null;

function mnt(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

function orderSizeLabel(order: Order) {
  return formatSizeBreakdown(order.size_breakdown) || `${order.size ?? "—"} × ${order.quantity}`;
}

function safeCsvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadOrders(orders: Order[]) {
  const header = [
    "Order", "Created", "Name", "Phone", "Company", "Item", "Category", "Unit price MNT", "Qty", "Total MNT",
    "Fabric ratio", "Swatch", "Accent swatch", "Size breakdown", "Legacy size", "Measurements", "Garment view", "Back view", "Reflective tape",
    "Reflective color", "Logo text", "Status",
  ];
  const rows = orders.map((order) => [
    `OC-${String(order.order_number).padStart(6, "0")}`,
    order.created_at,
    order.customer_name,
    order.phone,
    order.company,
    order.product_name_snapshot,
    CATEGORY_LABELS[order.product_category_snapshot],
    order.unit_price_mnt,
    order.quantity,
    order.total_mnt,
    order.fabric_ratio,
    order.swatch_code,
    order.accent_swatch_code,
    orderSizeLabel(order),
    order.size ?? "",
    JSON.stringify(order.measurements),
    order.garment_view,
    order.back_view,
    order.reflective_tape,
    order.reflective_color,
    order.logo_text,
    order.status,
  ]);
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(safeCsvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ochir-orders.csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AdminLogin() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError("");
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });
      if (signInError) {
        setError("Нэвтрэх мэдээллийг шалгана уу.");
        return;
      }
      router.refresh();
    } catch {
      setError("Нэвтрэх мэдээллийг шалгана уу.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-card">
      <p className="eyebrow">Ochir Couture</p>
      <h1>Админ нэвтрэх</h1>
      <p>Захиалга болон бүтээгдэхүүнийг удирдах эрхтэй хэрэглэгчээр нэвтэрнэ үү.</p>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label className="field-label">Имэйл<input className="field-input" autoComplete="username" name="email" required type="email" /></label>
        <label className="field-label">Нууц үг<input className="field-input" autoComplete="current-password" name="password" required type="password" /></label>
        <button className="button-primary" disabled={pending} type="submit">{pending ? "Нэвтэрч байна…" : "Нэвтрэх"}</button>
        <p className="admin-feedback" data-tone="error" role="status" aria-live="polite">{error}</p>
      </form>
    </section>
  );
}

export function AdminDashboard({ email }: { email: string }) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);
  const [csvPending, setCsvPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async (showPending = false) => {
    if (showPending) {
      setLoading(true);
      setFeedback(null);
    }
    try {
      const supabase = createBrowserSupabaseClient();
      const [orderResult, productResult] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("products").select("*").order("name").limit(200),
      ]);
      if (orderResult.error || productResult.error) {
        setFeedback({ tone: "error", message: "Админ мэдээлэл ачаалж чадсангүй. Нэвтрэх эрх болон RLS migration-ийг шалгана уу." });
        setLoading(false);
        return;
      }
      setOrders(orderResult.data ?? []);
      setProducts(productResult.data ?? []);
    } catch {
      setFeedback({ tone: "error", message: "Сүлжээний алдаанаас админ мэдээлэл ачаалсангүй. Дахин оролдоно уу." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    setPendingOrder(orderId);
    setFeedback(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) setFeedback({ tone: "error", message: "Захиалгын төлөв шинэчлэгдсэнгүй." });
      else {
        setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
        setFeedback({ tone: "success", message: "Захиалгын төлөв шинэчлэгдлээ." });
      }
    } catch {
      setFeedback({ tone: "error", message: "Сүлжээний алдаанаас болж төлөв шинэчлэгдсэнгүй." });
    } finally {
      setPendingOrder(null);
    }
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const price = Number(data.get("price"));
    if (!Number.isInteger(price) || price < 1 || price > 100_000_000) {
      setFeedback({ tone: "error", message: "Үнэ 1–100,000,000₮ хооронд бүхэл тоо байна." });
      return;
    }
    setPending(true);
    setFeedback(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("products").insert({
        name: String(data.get("name") ?? "").trim(),
        category: String(data.get("category") ?? "Workwear") as Product["category"],
        price_mnt: price,
        fabric: String(data.get("fabric") ?? "").trim(),
        tags: String(data.get("tags") ?? "").trim(),
        is_published: true,
      });
      if (error) {
        setFeedback({ tone: "error", message: "Бүтээгдэхүүн нэмэгдсэнгүй. Нэр, материал, эрхийг шалгана уу." });
        return;
      }
      form.reset();
      await load();
      setFeedback({ tone: "success", message: "Бүтээгдэхүүн каталогт нэмэгдлээ." });
    } catch {
      setFeedback({ tone: "error", message: "Сүлжээний алдаанаас болж бүтээгдэхүүн нэмэгдсэнгүй." });
    } finally {
      setPending(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`“${product.name}” бүтээгдэхүүнийг устгах уу?`)) return;
    setPending(true);
    setFeedback(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) {
        setFeedback({ tone: "error", message: "Бүтээгдэхүүнийг устгасангүй. Холбогдсон захиалга байгаа эсэхийг шалгана уу." });
        return;
      }
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setFeedback({ tone: "success", message: "Бүтээгдэхүүн устгагдлаа." });
    } catch {
      setFeedback({ tone: "error", message: "Сүлжээний алдаанаас болж бүтээгдэхүүн устсангүй." });
    } finally {
      setPending(false);
    }
  }

  async function exportCsv() {
    setCsvPending(true);
    setFeedback(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const allOrders: Order[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        const page = data ?? [];
        allOrders.push(...page);
        if (page.length < pageSize) break;
      }
      downloadOrders(allOrders);
      setFeedback({ tone: "success", message: `${allOrders.length} захиалгыг CSV файлд бэлдлээ.` });
    } catch {
      setFeedback({ tone: "error", message: "CSV бэлдэж чадсангүй. Админ эрх болон холболтыг шалгана уу." });
    } finally {
      setCsvPending(false);
    }
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <p className="eyebrow">Ochir Couture</p>
          <h1>Админ удирдлага</h1>
          <p>{email || "Админ хэрэглэгч"}</p>
        </div>
        <div className="hero-actions">
          <button className="button-secondary" disabled={loading} onClick={() => void load(true)} type="button">Шинэчлэх</button>
          <button className="button-quiet" onClick={() => void signOut()} type="button">Гарах</button>
        </div>
      </div>

      {feedback && <p className="admin-feedback" data-tone={feedback.tone} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.message}</p>}

      <div className="admin-grid">
        <section className="admin-panel">
          <div className="admin-toolbar">
            <div><h2>Захиалгууд</h2><small className="muted">Хамгийн сүүлийн 500 · CSV-д бүх захиалга орно</small></div>
            <button className="button-quiet" disabled={loading || orders.length === 0 || csvPending} onClick={() => void exportCsv()} type="button">{csvPending ? "Бэлтгэж байна…" : "CSV татах"}</button>
          </div>
          {loading ? <p className="admin-empty" role="status">Захиалгуудыг ачаалж байна…</p> : orders.length === 0 ? <p className="admin-empty">Одоогоор захиалга алга.</p> : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Дугаар</th><th>Огноо</th><th>Нэр / утас</th><th>Компани</th><th>Бараа</th><th>Материал</th><th>Хэмжээний хуваарилалт</th><th>Тоо</th><th>Дүн</th><th>Төлөв</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>OC-{String(order.order_number).padStart(6, "0")}</td>
                      <td>{new Date(order.created_at).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar" })}</td>
                      <td>{order.customer_name}<br /><span className="muted">{order.phone}</span></td>
                      <td>{order.company || "—"}</td>
                      <td>{order.product_name_snapshot}</td>
                      <td>{order.fabric_ratio} · #{order.swatch_code}</td>
                      <td>{orderSizeLabel(order)}<br /><span className="muted">{Object.entries(order.measurements ?? {}).map(([key, value]) => `${key}:${value}`).join(" ")}</span></td>
                      <td>{order.quantity}</td>
                      <td>{mnt(order.total_mnt)}</td>
                      <td>
                        <select aria-label={`${order.customer_name} захиалгын төлөв`} className="small-select" disabled={pendingOrder === order.id} onChange={(event) => void updateStatus(order.id, event.currentTarget.value as OrderStatus)} value={order.status}>
                          {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <h2>Бүтээгдэхүүн</h2>
          <form className="admin-add-form" onSubmit={addProduct}>
            <label className="field-label">Нэр<input className="field-input" maxLength={160} name="name" required /></label>
            <label className="field-label">Ангилал<select className="field-select" name="category">{CATEGORIES.filter((item) => item.value !== "All").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="field-label">Үнэ (₮)<input className="field-input" max={100_000_000} min={1} name="price" required type="number" /></label>
            <label className="field-label">Материал<input className="field-input" maxLength={160} name="fabric" /></label>
            <label className="field-label">Онцлог<input className="field-input" maxLength={500} name="tags" /></label>
            <button className="button-primary" disabled={pending} type="submit">{pending ? "Нэмж байна…" : "Нэмэх"}</button>
          </form>
          {loading ? <p className="admin-empty" role="status">Бүтээгдэхүүнийг ачаалж байна…</p> : products.length === 0 ? <p className="admin-empty">Бүтээгдэхүүн бүртгээгүй байна.</p> : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Нэр</th><th>Ангилал</th><th>Үнэ</th><th>Материал</th><th>Төлөв</th><th></th></tr></thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{CATEGORY_LABELS[product.category]}</td>
                      <td>{mnt(product.price_mnt)}</td>
                      <td>{product.fabric || "—"}</td>
                      <td><span className="status-pill">{product.is_published ? "Нийтэлсэн" : "Ноорог"}</span></td>
                      <td><button className="button-danger" disabled={pending} onClick={() => void deleteProduct(product)} type="button">Устгах</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
