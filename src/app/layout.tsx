import type { Metadata } from "next";
import "./globals.css";
import Snow from "@/components/Snow";

export const metadata: Metadata = {
  title: "WeDo - Collaborative Gift Registry",
  description:
    "A collaborative gift registry for families and groups to plan gifts together",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Snow />
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
