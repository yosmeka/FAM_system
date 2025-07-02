"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
// Use any as a fallback for ThemeProviderProps to avoid build error
type ThemeProviderProps = any;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
