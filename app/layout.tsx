import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Careloop | Medication care",
  description: "Medication monitoring and follow-up for family caregivers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
