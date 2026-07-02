import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Пространство Wemade",
  description: "Операционная система агентства Wemade для команды и клиентов"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
