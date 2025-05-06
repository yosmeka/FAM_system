"use client";
import { useEffect, useState } from "react";
import SunIcon from "@heroicons/react/24/outline/SunIcon";
import MoonIcon from "@heroicons/react/24/outline/MoonIcon";
import ComputerDesktopIcon from "@heroicons/react/24/outline/ComputerDesktopIcon";

const themes = [
  { name: "Light", icon: SunIcon, value: "light" },
  { name: "Dark", icon: MoonIcon, value: "dark" },
  { name: "Auto", icon: ComputerDesktopIcon, value: "auto" },
];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState("auto");

  // Cycle through themes on each click
  const cycleTheme = () => {
    const idx = themes.findIndex(t => t.value === theme);
    const next = themes[(idx + 1) % themes.length];
    setTheme(next.value);
  };

  useEffect(() => {
    // On mount, load theme from localStorage or system
    const stored = localStorage.getItem("theme");
    if (stored) setTheme(stored);
    else setTheme("auto");
  }, []);

  useEffect(() => {
    if (theme === "auto") {
      document.documentElement.classList.remove("dark");
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      }
    } else if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const currentTheme = themes.find(t => t.value === theme) || themes[2];
  const Icon = currentTheme.icon;

  return (
    <button
      aria-label={`Switch theme (${currentTheme.name})`}
      onClick={cycleTheme}
      className={`mr-2 p-2 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300`}
      title={`Switch theme (${currentTheme.name})`}
    >
      <Icon className="h-5 w-5 text-gray-700 dark:text-gray-200 transition-colors" />
    </button>
  );
}
