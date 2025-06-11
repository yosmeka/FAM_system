'use client';

import { useTheme } from './ThemeProvider';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500 transition-all duration-300 ease-in-out transform hover:scale-110"
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