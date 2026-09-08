import { Orbitron, IBM_Plex_Sans_JP, IBM_Plex_Mono } from "next/font/google";
import FuturisticBackdrop from "@/components/FuturisticBackdrop";
import "./globals.css";

const display = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = IBM_Plex_Sans_JP({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata = {
  title: "見積もりアプリ | 丹内建機サービス",
  description: "丹内建機サービス向け見積もり作成アプリ",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ja"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <FuturisticBackdrop />
        <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
