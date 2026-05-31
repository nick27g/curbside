import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Curbside",
  description: "Real-time street food vendor tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body style={{ height: "100%", margin: 0, padding: 0 }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
