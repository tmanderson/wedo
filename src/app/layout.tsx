import type { Metadata } from "next";
import "./globals.css";
import Snow from "@/components/Snow";
import { createClient } from "@/lib/supabase/server";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "WeDo - Collaborative Gift Registry",
  description:
    "A collaborative gift registry for families and groups to plan gifts together",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize the server client to establish the user session
  // This ensures the session is available when navigating between pages
  const supabase = await createClient();

  // Fetch the session to initialize it (this also refreshes expired tokens)
  await supabase.auth.getSession();

  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Snow />
          <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
        </Providers>
      </body>
    </html>
  );
}
