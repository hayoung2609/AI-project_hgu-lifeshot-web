import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한동 감성 인생샷 평가 모델",
  description:
    "AI가 미적 완성도, Handong Similarity, Landmark 포함 여부를 종합하여 Top 3 인생샷을 추천합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
