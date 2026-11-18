import Link from "next/link";
import { OrderStartLink } from "@/components/order-disclosure";

function SiteNavLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`nav-links ${className}`} aria-label="Үндсэн цэс">
      <Link href="#studio">3D студи</Link>
      <OrderStartLink>Захиалга</OrderStartLink>
      <Link className="nav-admin" href="/admin">Админ нэвтрэх</Link>
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" href="#top" aria-label="Ochir Couture нүүр хуудас">
          OCHIR COUTURE <span>МОНГОЛ ОЁДОЛ</span>
        </Link>
        <div className="site-navigation">
          <SiteNavLinks className="desktop-nav" />
          <details className="nav-disclosure">
            <summary aria-label="Цэс нээх"><span>Цэс</span><b aria-hidden="true">⌄</b></summary>
            <SiteNavLinks className="mobile-nav" />
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-width footer-inner">
        <Link className="wordmark" href="#top">OCHIR COUTURE</Link>
        <p>© {new Date().getFullYear()} Ochir Couture</p>
      </div>
    </footer>
  );
}
