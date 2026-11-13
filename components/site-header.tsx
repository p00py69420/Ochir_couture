import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" href="#top" aria-label="Ochir Couture нүүр хуудас">
          OCHIR COUTURE <span>МОНГОЛ ОЁДОЛ</span>
        </Link>
        <details className="nav-disclosure">
          <summary aria-label="Цэс нээх"><span>Цэс</span><b aria-hidden="true">⌄</b></summary>
          <nav className="nav-links" aria-label="Үндсэн цэс">
            <Link href="#catalog">Каталог</Link>
            <Link href="#studio">3D студи</Link>
            <Link href="#order">Захиалга</Link>
            <Link className="nav-admin" href="/admin">Админ нэвтрэх</Link>
          </nav>
        </details>
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
