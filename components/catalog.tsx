"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import type { Product } from "@/lib/database.types";
import { useCustomizer } from "@/components/customizer-provider";

type CatalogState = "ready" | "unconfigured" | "error";

function SetupNotice() {
  return (
    <div className="setup-state" role="status">
      <h3>Каталог хараахан холбогдоогүй байна</h3>
      <p>
        Бодит бүтээгдэхүүнийг харуулахын тулд Supabase-ийн орчны хувьсагчдыг тохируулж,
        <span className="inline-code"> supabase/migrations</span> доторх migration-ийг ажиллуулна уу.
        Холболт хийгдээгүй үед жишээ бараа харуулахгүй.
      </p>
    </div>
  );
}

function mnt(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}

export function Catalog({ products, state }: { products: Product[]; state: CatalogState }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("All");
  const [search, setSearch] = useState("");
  const { setSelectedProductId } = useCustomizer();

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("mn-MN");
    return products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesQuery = `${product.name} ${product.fabric} ${product.tags}`
        .toLocaleLowerCase("mn-MN")
        .includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [category, products, search]);

  if (state === "unconfigured") return <SetupNotice />;
  if (state === "error") {
    return (
      <div className="error-state" role="alert">
        <h3>Каталог ачаалж чадсангүй</h3>
        <p>Өгөгдлийн сангийн холболтыг шалгаад дахин оролдоно уу.</p>
        <button className="button-secondary" type="button" onClick={() => window.location.reload()}>Дахин ачаалах</button>
      </div>
    );
  }

  return (
    <>
      <div className="catalog-tools">
        <div className="filter-list" role="group" aria-label="Бүтээгдэхүүний ангилал">
          {CATEGORIES.map((item) => (
            <button
              className="filter-button"
              key={item.value}
              type="button"
              aria-pressed={category === item.value}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="search-wrap">
          <span className="search-symbol" aria-hidden="true">⌕</span>
          <input
            className="field-input"
            type="search"
            aria-label="Нэр, материал эсвэл онцлогоор хайх"
            placeholder="Нэр, материал, онцлогоор хайх…"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </label>
      </div>

      {products.length === 0 ? (
        <div className="empty-state"><h3>Бүтээгдэхүүн алга</h3><p>Одоогоор каталогт нийтэлсэн бүтээгдэхүүн байхгүй байна.</p></div>
      ) : visibleProducts.length === 0 ? (
        <div className="empty-state"><h3>Илэрц олдсонгүй</h3><p>Хайлтын үг эсвэл ангиллыг өөрчилж үзнэ үү.</p></div>
      ) : (
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <p className="product-category">{CATEGORY_LABELS[product.category]}</p>
              <h3>{product.name}</h3>
              <p className="product-detail">{[product.fabric, product.tags].filter(Boolean).join(" · ")}</p>
              <div className="product-bottom">
                <p className="price">{mnt(product.price_mnt)}<small>Нэг бүрийн үнэ</small></p>
                <a
                  className="product-order"
                  href="#order"
                  onClick={() => setSelectedProductId(product.id)}
                >
                  Сонгох
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
