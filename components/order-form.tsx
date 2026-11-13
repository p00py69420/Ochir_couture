"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { SWATCHES } from "@/lib/constants";
import type { Measurements, Product } from "@/lib/database.types";
import { useCustomizer } from "@/components/customizer-provider";

type Feedback = { tone: "success" | "error"; message: string } | null;

function mnt(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

export function OrderForm({
  products,
  configured,
  serverConfigured,
  rateLimitConfigured,
}: {
  products: Product[];
  configured: boolean;
  serverConfigured: boolean;
  rateLimitConfigured: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submissionId = useRef("");
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const {
    baseSwatch,
    accentSwatch,
    garmentView,
    backView,
    reflectiveTape,
    reflectiveColor,
    fabricRatio,
    setFabricRatio,
    logoText,
    lux,
    selectedProductId,
    setSelectedProductId,
  } = useCustomizer();

  const product = products.find((item) => item.id === selectedProductId) ?? products[0] ?? null;
  const discount = quantity >= 50 ? 0.8 : quantity >= 10 ? 0.9 : 1;
  const total = useMemo(
    () => product ? Math.round(product.price_mnt * quantity * discount) : 0,
    [discount, product, quantity],
  );
  const swatch = SWATCHES.find((item) => item.code === baseSwatch);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !product) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setFeedback(null);

    if (!submissionId.current) submissionId.current = crypto.randomUUID();
    const measurements: Measurements = {};
    for (const key of ["height", "chest", "waist", "hip", "sleeve"] as const) {
      const value = String(data.get(key) ?? "").trim();
      if (value) measurements[key] = Number(value);
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submissionId: submissionId.current,
          productId: product.id,
          customerName: data.get("customerName"),
          phone: data.get("phone"),
          company: data.get("company"),
          quantity: Number(data.get("quantity")),
          fabricRatio,
          swatchCode: baseSwatch,
          accentSwatchCode: accentSwatch,
          size: data.get("size"),
          measurements,
          garmentView,
          backView,
          reflectiveTape,
          reflectiveColor,
          logoText,
          lux,
          website: data.get("website"),
        }),
      });
      const result = (await response.json()) as { error?: string; orderNumber?: number; duplicate?: boolean };
      if (!response.ok) {
        setFeedback({ tone: "error", message: result.error ?? "Захиалга илгээж чадсангүй. Дахин оролдоно уу." });
        return;
      }

      const number = result.orderNumber ? ` OC-${String(result.orderNumber).padStart(6, "0")}` : "";
      setFeedback({ tone: "success", message: result.duplicate ? `Энэ захиалга өмнө нь бүртгэгдсэн байна.${number}` : `Захиалга хүлээн авлаа.${number}` });
      submissionId.current = "";
      form.reset();
      setQuantity(1);
    } catch {
      setFeedback({ tone: "error", message: "Сүлжээний алдаа гарлаа. Өгөгдлийг шалгаад дахин илгээнэ үү." });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="order-heading">
        <h2 id="order-title">Захиалга өгөх</h2>
        <p>Бид таны мэдээлэлд тулгуурлан үнийн дүнг тооцно. Эцсийн хэмжээг ажилтан баталгаажуулна.</p>
      </div>
      {!configured ? (
        <div className="setup-state" role="status">
          <h3>Захиалгын мэдээллийн сан тохируулаагүй байна</h3>
          <p><span className="inline-code">.env.local</span> файлд Supabase-ийн нийтэд ашиглах хувьсагчдыг оруулж migration-ийг ажиллуулсны дараа захиалга нээгдэнэ.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state" role="status"><h3>Захиалах бүтээгдэхүүн алга</h3><p>Каталогт нийтэлсэн бүтээгдэхүүн нэмсний дараа захиалга авах боломжтой.</p></div>
      ) : (
        <form className="order-card" onSubmit={handleSubmit} ref={formRef}>
          <div>
            <div className="order-fields">
              <label className="field-label">Нэр<input className="field-input" autoComplete="name" maxLength={120} name="customerName" placeholder="Таны нэр" required /></label>
              <label className="field-label">Утас<input className="field-input" autoComplete="tel" maxLength={40} name="phone" placeholder="Утасны дугаар" required /></label>
              <label className="field-label">Компани<input className="field-input" autoComplete="organization" maxLength={160} name="company" placeholder="Заавал биш" /></label>
              <label className="field-label">Бүтээгдэхүүн
                <select className="field-select" name="productId" onChange={(event) => setSelectedProductId(event.currentTarget.value)} value={product.id}>
                  {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="field-label">Даавууны харьцаа
                <select className="field-select" name="fabricRatio" onChange={(event) => setFabricRatio(event.currentTarget.value as "65/35" | "20/80")} value={fabricRatio}>
                  <option value="65/35">65/35 — полиэстер / хөвөн</option>
                  <option value="20/80">20/80 — полиэстер / хөвөн</option>
                </select>
              </label>
              <label className="field-label">Хэмжээ
                <select className="field-select" defaultValue="L" name="size">
                  {["S", "M", "L", "XL", "2XL", "3XL", "4XL"].map((size) => <option key={size}>{size}</option>)}
                </select>
              </label>
              <label className="field-label">Тоо ширхэг
                <input className="field-input" max={2000} min={1} name="quantity" onChange={(event) => setQuantity(Math.max(1, Math.min(2000, Number(event.currentTarget.value) || 1)))} type="number" value={quantity} />
              </label>
              <div className="wide model-limit">
                Сонгосон өнгө, загвар, тууз, харьцаа болон логоны мэдээллийг захиалгад хавсаргана. 3D загвар нь эдгээр өөрчлөлтийг тусад нь харуулахгүй.
              </div>
              <p className="wide field-label" style={{ marginBottom: 0 }}>Хэмжээс (см) · заавал биш</p>
              <label className="field-label">Өндөр<input className="field-input" max={230} min={100} name="height" placeholder="см" step="0.5" type="number" /></label>
              <label className="field-label">Цээж<input className="field-input" max={180} min={30} name="chest" placeholder="см" step="0.5" type="number" /></label>
              <label className="field-label">Бүс<input className="field-input" max={180} min={30} name="waist" placeholder="см" step="0.5" type="number" /></label>
              <label className="field-label">Ташаа<input className="field-input" max={200} min={30} name="hip" placeholder="см" step="0.5" type="number" /></label>
              <label className="field-label">Ханцуй<input className="field-input" max={120} min={20} name="sleeve" placeholder="см" step="0.5" type="number" /></label>
            </div>
            <label className="honeypot" aria-hidden="true">Вэбсайт<input autoComplete="off" name="website" tabIndex={-1} /></label>
          </div>

          <aside className="order-summary" aria-label="Захиалгын дүн">
            <p className="summary-label">Таны сонголт</p>
            <p className="summary-product">{product.name}</p>
            <p className="summary-detail">{swatch?.label} · {fabricRatio} · {quantity} ширхэг</p>
            <p className="summary-total">{mnt(total)}</p>
            <p className="discount-note">1–9 энгийн үнэ · 10–49 ширхэг 10% · 50+ ширхэг 20% хөнгөлөлт</p>
            <button className="button-primary" disabled={pending || !serverConfigured || !rateLimitConfigured} type="submit">
              {pending ? "Илгээж байна…" : "Захиалга илгээх"}
            </button>
            {!serverConfigured && <p className="order-feedback" data-tone="error">Серверийн Supabase secret key-ийг тохируулаагүй байна.</p>}
            {!rateLimitConfigured && <p className="order-feedback" data-tone="error">Захиалгыг хамгаалах Upstash rate limit тохируулаагүй байна.</p>}
            <p className="order-feedback" data-tone={feedback?.tone ?? ""} role="status" aria-live="polite">{feedback?.message ?? ""}</p>
          </aside>
        </form>
      )}
    </>
  );
}
