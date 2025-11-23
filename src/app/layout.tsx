import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
