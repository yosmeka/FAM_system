'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  href?: string;
  className?: string;
}

export function BackButton({ href, className = '' }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors ${className}`}
    >
      <ArrowLeft className="h-5 w-5" />
      <span>Back</span>
    </button>
  );
} 