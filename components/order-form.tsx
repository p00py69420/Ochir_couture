"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SWATCHES } from "@/lib/constants";
import type { Measurements, Product } from "@/lib/database.types";
import { MAX_ORDER_QUANTITY, ORDER_SIZES, emptySizeBreakdown, formatSizeBreakdown, type OrderSize } from "@/lib/order-sizes";
import { useCustomizer } from "@/components/customizer-provider";
import { useOrderDisclosure } from "@/components/order-disclosure";

type Feedback = {
  tone: "success" | "error";
  message: string;
  detail?: string;
  totalMnt?: number;
} | null;

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
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const submissionId = useRef("");
  const { expanded, toggleOrderForm } = useOrderDisclosure();
  const [sizeQuantities, setSizeQuantities] = useState(emptySizeBreakdown);
  const [invalidSize, setInvalidSize] = useState<OrderSize | null>(null);
  const [quantityInputError, setQuantityInputError] = useState("");
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
    selectedProductId,
    setSelectedProductId,
  } = useCustomizer();

  const product = products.find((item) => item.id === selectedProductId) ?? products[0] ?? null;
  const totalQuantity = ORDER_SIZES.reduce((total, size) => total + sizeQuantities[size], 0);
  const quantityLimitExceeded = totalQuantity > MAX_ORDER_QUANTITY;
  const sizeSummary = formatSizeBreakdown(sizeQuantities);
  const swatch = SWATCHES.find((item) => item.code === baseSwatch);
  const confirmedPrice = feedback?.tone === "success" ? feedback.totalMnt : undefined;
  const submitDisabled =
    pending || !product || !serverConfigured || !rateLimitConfigured ||
    totalQuantity === 0 || quantityLimitExceeded || invalidSize !== null;

  useEffect(() => {
    if (!expanded) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("order")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      firstFieldRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expanded]);

  function updateSizeQuantity(size: OrderSize, rawValue: string) {
    if (rawValue === "") {
      setSizeQuantities((current) => ({ ...current, [size]: 0 }));
      setInvalidSize(null);
      setQuantityInputError("");
      return;
    }

    const quantity = Number(rawValue);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      setInvalidSize(size);
      setQuantityInputError("Хэмжээ тус бүрийн тоог 0 буюу түүнээс дээш бүхэл тоогоор оруулна уу.");
      return;
    }

    setSizeQuantities((current) => ({ ...current, [size]: quantity }));
    setInvalidSize(null);
    setQuantityInputError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !product) return;
    if (totalQuantity === 0) {
      setFeedback({ tone: "error", message: "Захиалгын хэмжээг сонгоно уу." });
      return;
    }
    if (quantityLimitExceeded || invalidSize) {
      setFeedback({ tone: "error", message: "Хэмжээ тус бүрийн тоог шалгана уу. Нийт захиалга 2000 ширхэгээс хэтрэхгүй." });
      return;
    }

    const data = new FormData(event.currentTarget);
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
          sizeBreakdown: sizeQuantities,
          fabricRatio,
          swatchCode: baseSwatch,
          accentSwatchCode: accentSwatch,
          measurements,
          garmentView,
          backView,
          reflectiveTape,
          reflectiveColor,
          logoText,
          website: data.get("website"),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        orderNumber?: number;
        quantity?: number;
        totalMnt?: number;
        duplicate?: boolean;
      };
      if (!response.ok) {
        setFeedback({ tone: "error", message: result.error ?? "Захиалга илгээж чадсангүй. Дахин оролдоно уу." });
        return;
      }

      const number = result.orderNumber ? ` OC-${String(result.orderNumber).padStart(6, "0")}` : "";
      setFeedback({
        tone: "success",
        message: result.duplicate ? `Энэ захиалга өмнө нь бүртгэгдсэн байна.${number}` : `Захиалга хүлээн авлаа.${number}`,
        detail: `${sizeSummary} · Нийт ${result.quantity ?? totalQuantity} ширхэг`,
        totalMnt: result.totalMnt,
      });
      submissionId.current = "";
    } catch {
      setFeedback({ tone: "error", message: "Сүлжээний алдаа гарлаа. Өгөгдлийг шалгаад дахин илгээнэ үү." });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="order-heading">
        <div>
          <h2 id="order-title">Захиалга өгөх</h2>
          <p>Захиалгын үнийг бүтээгдэхүүний одоогийн үнээр сервер тооцож, ажилтан эцсийн хэмжээг баталгаажуулна.</p>
        </div>
        <button
          aria-controls="order-form-panel"
          aria-expanded={expanded}
          className="button-secondary order-toggle"
          onClick={toggleOrderForm}
          type="button"
        >
          {expanded ? "Маягт хаах" : "Маягт нээх"}
        </button>
      </div>

      <div aria-labelledby="order-title" className="order-form-panel" hidden={!expanded} id="order-form-panel">
        {!configured ? (
          <div className="setup-state" role="status">
            <h3>Захиалгын мэдээллийн сан тохируулаагүй байна</h3>
            <p><span className="inline-code">.env.local</span> файлд Supabase-ийн нийтэд ашиглах хувьсагчдыг оруулж migration-ийг ажиллуулсны дараа захиалга нээгдэнэ.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state" role="status"><h3>Захиалах бүтээгдэхүүн алга</h3><p>Админ хэсэгт нийтэлсэн бүтээгдэхүүн нэмсний дараа захиалга авах боломжтой.</p></div>
        ) : (
          <form aria-busy={pending} className="order-card" onSubmit={handleSubmit}>
            <div>
              <div className="order-fields">
                <label className="field-label" htmlFor="customer-name">Нэр<input className="field-input" autoComplete="name" id="customer-name" maxLength={120} name="customerName" placeholder="Таны нэр" ref={firstFieldRef} required /></label>
                <label className="field-label" htmlFor="customer-phone">Утас<input className="field-input" autoComplete="tel" id="customer-phone" maxLength={40} name="phone" placeholder="Утасны дугаар" required /></label>
                <label className="field-label" htmlFor="customer-company">Компани<input className="field-input" autoComplete="organization" id="customer-company" maxLength={160} name="company" placeholder="Заавал биш" /></label>
                <label className="field-label" htmlFor="product-id">Бүтээгдэхүүн
                  <select className="field-select" id="product-id" name="productId" onChange={(event) => setSelectedProductId(event.currentTarget.value)} value={product?.id ?? ""}>
                    {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="field-label" htmlFor="fabric-ratio">Даавууны харьцаа
                  <select className="field-select" id="fabric-ratio" name="fabricRatio" onChange={(event) => setFabricRatio(event.currentTarget.value as "65/35" | "20/80")} value={fabricRatio}>
                    <option value="65/35">65/35 — полиэстер / хөвөн</option>
                    <option value="20/80">20/80 — полиэстер / хөвөн</option>
                  </select>
                </label>

                <fieldset aria-describedby="size-guide" className="size-breakdown wide">
                  <legend>Хэмжээ тус бүрийн тоо</legend>
                  <p className="size-guide" id="size-guide">44–60 нь захиалгын размерын сонголт. Загвар бүрийн эсгүүр өөр тул тохирох хэмжээг Ochir Couture-тэй баталгаажуулна уу.</p>
                  <div className="size-grid">
                    {ORDER_SIZES.map((size) => (
                      <label className="size-field" key={size}>
                        <span>{size}</span>
                        <input
                          aria-describedby={invalidSize === size ? "size-error" : undefined}
                          aria-invalid={invalidSize === size}
                          aria-label={`${size} размерын тоо ширхэг`}
                          className="field-input size-quantity"
                          max={MAX_ORDER_QUANTITY}
                          min={0}
                          onChange={(event) => updateSizeQuantity(size, event.currentTarget.value)}
                          step={1}
                          type="number"
                          value={sizeQuantities[size]}
                        />
                      </label>
                    ))}
                  </div>
                  {quantityInputError && <p className="size-error" id="size-error" role="alert">{quantityInputError}</p>}
                  {quantityLimitExceeded && <p className="size-error" role="alert">Нийт хэмжээ {MAX_ORDER_QUANTITY} ширхэгээс хэтрэхгүй байна.</p>}
                  <div aria-live="polite" className="size-total-row">
                    <span>{sizeSummary || "Хэмжээ сонгоогүй"}</span>
                    <strong id="size-total">Нийт: {totalQuantity} ширхэг</strong>
                  </div>
                </fieldset>

                <div className="wide model-limit">
                  Үндсэн болон нэмэлт өнгө, цацруулагч туузны сонголт 3D дүрслэлд харагдана. Хувцасны төрөл, харьцаа, логоны мэдээлэл захиалгад тэмдэглэгдэнэ.
                </div>
                <p className="wide field-label measurement-heading">Хэмжээс (см) · нэмэлт</p>
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
              <p className="summary-detail">{swatch?.label} · {fabricRatio}</p>
              <p className="summary-size-list">{sizeSummary || "Хэмжээ сонгоогүй"}</p>
              <p className="summary-quantity">Нийт {totalQuantity} ширхэг</p>
              <p className="summary-label summary-price-label">Үнийн дүн</p>
              <p className="summary-total">{confirmedPrice === undefined ? "Сервер тооцно" : mnt(confirmedPrice)}</p>
              <p className="discount-note">Одоогийн үнээр болон хөнгөлөлтийг сервер тооцно.</p>
              <button className="button-primary" disabled={submitDisabled} type="submit">
                {pending ? "Илгээж байна…" : "Захиалга илгээх"}
              </button>
              {!serverConfigured && <p className="order-feedback" data-tone="error" role="alert">Серверийн Supabase secret key-ийг тохируулаагүй байна.</p>}
              {!rateLimitConfigured && <p className="order-feedback" data-tone="error" role="alert">Захиалгыг хамгаалах Upstash rate limit тохируулаагүй байна.</p>}
              {pending && <p className="order-feedback" role="status" aria-live="polite">Захиалгыг серверт илгээж байна…</p>}
              {feedback && (
                <div className="order-feedback" data-tone={feedback.tone} role={feedback.tone === "error" ? "alert" : "status"} aria-live={feedback.tone === "error" ? "assertive" : "polite"}>
                  <p>{feedback.message}</p>
                  {feedback.detail && <span>{feedback.detail}</span>}
                </div>
              )}
            </aside>
          </form>
        )}
      </div>
    </>
  );
}
