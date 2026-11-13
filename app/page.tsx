import Link from "next/link";
import { Catalog } from "@/components/catalog";
import { CustomizerProvider } from "@/components/customizer-provider";
import { OrderForm } from "@/components/order-form";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { StudioLazy } from "@/components/studio-lazy";
import { getPublicCatalog } from "@/lib/catalog";
import { hasOrderProtectionConfig, hasSupabaseSecretConfig } from "@/lib/server-config";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getPublicCatalog();
  const products = catalog.products;
  const configured = hasSupabasePublicConfig();
  const orderProtectionConfigured = hasOrderProtectionConfig();
  const serverOrderConfigured = hasSupabaseSecretConfig();

  return (
    <CustomizerProvider initialProductId={products[0]?.id ?? ""}>
      <SiteHeader />
      <main>
        <section className="hero page-width" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Захиалгат хувцас · Оёдол</p>
            <h1>Уурхай, үйлдвэрт зориулсан <em>ажлын хувцас</em></h1>
            <p className="hero-context">Үдшийн гоёлоос уурхайн хамгаалалт хүртэл</p>
            <div className="hero-actions">
              <Link className="button-primary" href="#order">Захиалга өгөх</Link>
              <Link className="button-secondary" href="#catalog">Каталог үзэх</Link>
            </div>
          </div>
          <section className="hero-model" id="studio" aria-label="3D ажлын хувцасны загвар">
            <StudioLazy />
          </section>
        </section>

        <section className="section" id="catalog">
          <div className="page-width">
            <div className="section-heading">
              <h2>Каталог</h2>
              <p>Ажлын болон захиалгат хувцасны загвараас сонгоно уу.</p>
            </div>
            <Catalog products={products} state={catalog.state} />
          </div>
        </section>

        <section className="section order-section" id="order">
          <div className="page-width">
            <OrderForm products={products} configured={configured} serverConfigured={serverOrderConfigured} rateLimitConfigured={orderProtectionConfigured} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </CustomizerProvider>
  );
}
