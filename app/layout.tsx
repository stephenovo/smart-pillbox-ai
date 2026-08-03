import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Pillbox | Medication care",
  description: "Medication monitoring and follow-up for family caregivers",
};

const themeInitializationScript = `
  try {
    var savedTheme = window.localStorage.getItem("smart-pillbox-theme");
    var theme = savedTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={figtree.variable}>
        {children}
        <Script id="theme-initializer" strategy="beforeInteractive">
          {themeInitializationScript}
        </Script>
      </body>
    </html>
  );
}
