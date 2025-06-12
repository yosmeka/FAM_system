'use client';

import { useTheme } from './ThemeProvider';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center rounded-md p-2 text-[#000000] dark:text-[#ffffff] hover:text-red-400 dark:hover:text-red-400 transition-all duration-300 ease-in-out transform hover:scale-110"
      aria-label="Toggle theme"
    >
      <span className="absolute -inset-0.5" />
      {theme === 'dark' ? (
        <SunIcon className="h-5 w-5" aria-hidden="true" />
      ) : (
        <MoonIcon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
} 