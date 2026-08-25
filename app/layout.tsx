import type { Metadata } from "next";
import "./globals.css";
import "./channels.css";
export const metadata: Metadata = {
  title: "Distribution Agent",
  description:
    "Find, qualify, and review thoughtful Reddit promotion opportunities.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
