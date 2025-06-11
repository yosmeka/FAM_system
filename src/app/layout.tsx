import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast"; // ✅ Use the one from react-hot-toast
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/query-provider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fixed Asset Management System",
  description: "Zemen Bank Fixed Asset Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${inter.className}`}>
        <SessionProvider>
          <AuthProvider>
            <PermissionsProvider>
              <QueryProvider>
                <ThemeProvider>
                  {children}
                  <Toaster position="top-right" />
                </ThemeProvider>
              </QueryProvider>
            </PermissionsProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
