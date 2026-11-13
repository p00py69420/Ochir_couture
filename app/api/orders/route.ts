import { NextResponse } from "next/server";
import { getOrderLimiter } from "@/lib/rate-limit";
import type { GarmentView, Measurements } from "@/lib/database.types";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";

export const runtime = "nodejs";

const SIZES = new Set(["S", "M", "L", "XL", "2XL", "3XL", "4XL"]);
const GARMENT_VIEWS = new Set<GarmentView>(["suit", "jacket", "pants"]);
const RATIOS = new Set(["65/35", "20/80"]);
const MEASUREMENT_LIMITS = {
  height: [100, 230],
  chest: [30, 180],
  waist: [30, 180],
  hip: [30, 200],
  sleeve: [20, 120],
} as const;

function json(body: Record<string, unknown>, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("cache-control", "no-store");
  return NextResponse.json(body, {
    status,
    headers: responseHeaders,
  });
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validSwatch(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 201 && value <= 212;
}

function validateMeasurements(value: unknown): Measurements | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const output: Measurements = {};
  for (const [key, bounds] of Object.entries(MEASUREMENT_LIMITS) as [keyof typeof MEASUREMENT_LIMITS, readonly [number, number]][]) {
    const raw = input[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(parsed) || parsed < bounds[0] || parsed > bounds[1]) return null;
    output[key] = Math.round(parsed * 10) / 10;
  }
  return output;
}

export async function POST(request: Request) {
  if (!hasSupabasePublicConfig() || !process.env.SUPABASE_SECRET_KEY?.trim()) {
    return json({ error: "Захиалгын мэдээллийн сангийн тохиргоо дутуу байна." }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 12_000) return json({ error: "Илгээсэн мэдээлэл хэт урт байна." }, 413);

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return json({ error: "Энэ хүсэлтийг хүлээн авах боломжгүй." }, 403);
      }
    } catch {
      return json({ error: "Хүсэлтийн эх сурвалж буруу байна." }, 403);
    }
  }

  const limiter = getOrderLimiter();
  if (!limiter) return json({ error: "Захиалгын rate limit тохируулаагүй байна. Upstash-ийн env утгуудыг нэмнэ үү." }, 503);

  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const identifier = forwardedIp || (process.env.NODE_ENV === "development" ? "local-development" : null);
  if (!identifier) return json({ error: "Хүсэлтийн IP мэдээлэл олдсонгүй." }, 503);

  try {
    const rate = await limiter.limit(identifier);
    if (!rate.success) {
      const retryAfter = Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000));
      return json(
        { error: "Олон хүсэлт дараалан ирлээ. Түр хүлээгээд дахин оролдоно уу." },
        429,
        { "retry-after": String(retryAfter) },
      );
    }
  } catch {
    return json({ error: "Захиалгыг хамгаалах үйлчилгээ түр холбогдохгүй байна." }, 503);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "Илгээсэн мэдээллийн формат буруу байна." }, 400);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return json({ error: "Захиалгын мэдээлэл буруу байна." }, 400);
  }
  const body = raw as Record<string, unknown>;

  if (cleanText(body.website, 200)) return json({ received: true });
  const submissionId = cleanText(body.submissionId, 36);
  const productId = cleanText(body.productId, 36);
  const customerName = cleanText(body.customerName, 120);
  const phone = cleanText(body.phone, 40);
  const company = cleanText(body.company, 160);
  const quantity = body.quantity;
  const fabricRatio = cleanText(body.fabricRatio, 5);
  const size = cleanText(body.size, 3);
  const measurements = validateMeasurements(body.measurements);
  const garmentView = cleanText(body.garmentView, 8) as GarmentView;
  const backView = body.backView;
  const reflectiveTape = body.reflectiveTape;
  const reflectiveColor = cleanText(body.reflectiveColor, 7);
  const logoText = cleanText(body.logoText, 40);
  const lux = body.lux;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
    return json({ error: "Илгээмжийн дугаар буруу байна. Дахин оролдоно уу." }, 400);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    return json({ error: "Бүтээгдэхүүнээ дахин сонгоно уу." }, 400);
  }
  if (customerName.length < 2 || !/^[+\d\s().-]{4,40}$/.test(phone) || phone.replace(/\D/g, "").length < 4) {
    return json({ error: "Нэр эсвэл утасны дугаарыг шалгана уу." }, 400);
  }
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 2000) {
    return json({ error: "Тоо ширхэг 1–2000 хооронд бүхэл тоо байх ёстой." }, 400);
  }
  if (!RATIOS.has(fabricRatio) || !SIZES.has(size) || !GARMENT_VIEWS.has(garmentView)) {
    return json({ error: "Хэмжээ эсвэл материалын сонголтыг шалгана уу." }, 400);
  }
  if (
    !validSwatch(body.swatchCode) ||
    !validSwatch(body.accentSwatchCode) ||
    typeof backView !== "boolean" ||
    typeof reflectiveTape !== "boolean" ||
    !/^#[0-9A-Fa-f]{6}$/.test(reflectiveColor) ||
    typeof lux !== "number" || !Number.isInteger(lux) || lux < 0 || lux > 500 ||
    measurements === null
  ) {
    return json({ error: "Өнгө эсвэл нэмэлт хэмжээсийн мэдээллийг шалгана уу." }, 400);
  }

  try {
    const supabase = createServiceSupabaseClient();
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id,name,category,price_mnt,is_published")
      .eq("id", productId)
      .eq("is_published", true)
      .maybeSingle();

    if (productError || !product) return json({ error: "Сонгосон бүтээгдэхүүн олдсонгүй." }, 400);

    const discount = quantity >= 50 ? 0.8 : quantity >= 10 ? 0.9 : 1;
    const total = Math.round(product.price_mnt * quantity * discount);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        submission_id: submissionId,
        customer_name: customerName,
        phone,
        company,
        product_id: product.id,
        product_name_snapshot: product.name,
        product_category_snapshot: product.category,
        unit_price_mnt: product.price_mnt,
        quantity,
        total_mnt: total,
        fabric_ratio: fabricRatio as "65/35" | "20/80",
        swatch_code: body.swatchCode,
        accent_swatch_code: body.accentSwatchCode,
        size,
        measurements,
        garment_view: garmentView,
        back_view: backView,
        reflective_tape: reflectiveTape,
        reflective_color: reflectiveColor,
        logo_text: logoText,
        lux,
        status: "INITIAL_RECEIVED",
      })
      .select("id,order_number")
      .single();

    if (error?.code === "23505") return json({ received: true, duplicate: true });
    if (error || !data) return json({ error: "Захиалгыг хадгалж чадсангүй. Дахин оролдоно уу." }, 500);
    return json({ received: true, orderNumber: data.order_number }, 201);
  } catch {
    return json({ error: "Захиалгын мэдээллийн сан түр холбогдохгүй байна." }, 503);
  }
}
