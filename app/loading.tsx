export default function Loading() {
  return (
    <main className="page-width" aria-busy="true" aria-live="polite" style={{ paddingBlock: 90 }}>
      <div className="loading-ring" aria-hidden="true" />
      <p style={{ color: "var(--muted)", marginTop: 18 }}>Ochir Couture ачаалж байна…</p>
      <div className="product-grid" aria-hidden="true" style={{ marginTop: 32 }}>
        {[0, 1, 2].map((item) => <div className="product-card" key={item} style={{ minHeight: 180, opacity: .55 }} />)}
      </div>
    </main>
  );
}
