import type { ProductCategory } from "@/lib/database.types";

export const CATEGORIES: { value: ProductCategory | "All"; label: string }[] = [
  { value: "All", label: "Бүгд" },
  { value: "Workwear", label: "Ажлын хувцас" },
  { value: "Evening", label: "Үдшийн гоёл" },
  { value: "Deel", label: "Үндэсний дээл" },
  { value: "Corporate", label: "Албаны дүрэмт хувцас" },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  Workwear: "Ажлын хувцас",
  Evening: "Үдшийн гоёл",
  Deel: "Үндэсний дээл",
  Corporate: "Албаны дүрэмт хувцас",
};

export const SWATCHES = [
  { code: 201, name: "Royal Blue", label: "Хөх", color: "#2563eb" },
  { code: 202, name: "Navy Blue", label: "Хар хөх", color: "#1e3a8a" },
  { code: 203, name: "Dark Navy", label: "Гүн хөх", color: "#0f172a" },
  { code: 204, name: "Charcoal Grey", label: "Нүүрсэн саарал", color: "#475569" },
  { code: 205, name: "Sky Blue", label: "Цэнхэр", color: "#38bdf8" },
  { code: 206, name: "Beige Cream", label: "Шаргал", color: "#fef08a" },
  { code: 207, name: "Ivory White", label: "Зааны ясан", color: "#f8fafc" },
  { code: 208, name: "Bright Red", label: "Улаан", color: "#dc2626" },
  { code: 209, name: "Safety Orange", label: "Улбар шар", color: "#ea580c" },
  { code: 210, name: "Safety Yellow", label: "Шар", color: "#eab308" },
  { code: 211, name: "Teal Green", label: "Ногоовтор хөх", color: "#0d9488" },
  { code: 212, name: "Deep Black", label: "Хар", color: "#18181b" },
] as const;

export const STATUSES = [
  "INITIAL_RECEIVED",
  "IN_PRODUCTION",
  "QC_PASSED",
  "DELIVERED",
] as const;

export const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  INITIAL_RECEIVED: "Хүлээн авсан",
  IN_PRODUCTION: "Үйлдвэрлэлд",
  QC_PASSED: "Чанар шалгасан",
  DELIVERED: "Хүргэсэн",
};

export const RATIOS = {
  "65/35": {
    description: "65% полиэстер · 35% хөвөн",
    qualities: [95, 55, 50],
  },
  "20/80": {
    description: "20% полиэстер · 80% самнасан хөвөн",
    qualities: [60, 92, 95],
  },
} as const;
