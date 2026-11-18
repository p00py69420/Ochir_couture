import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ochir Couture — Ажлын хувцас, захиалгат оёдол",
    template: "%s | Ochir Couture",
  },
  description:
    "Үдшийн гоёлоос уурхайн хамгаалалт хүртэл. Ochir Couture-ийн бүтээгдэхүүн, 3D загвар, захиалгын мэдээлэл.",
  applicationName: "Ochir Couture",
  openGraph: {
    type: "website",
    locale: "mn_MN",
    siteName: "Ochir Couture",
    title: "Ochir Couture — Ажлын хувцас, захиалгат оёдол",
    description: "Үдшийн гоёлоос уурхайн хамгаалалт хүртэл.",
  },
  twitter: {
    card: "summary",
    title: "Ochir Couture",
    description: "Ажлын болон захиалгат хувцас.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0a08",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
