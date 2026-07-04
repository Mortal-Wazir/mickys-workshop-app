import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Micky's Workshop",
  description: "B.Tech project collaboration and exam preparation workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
