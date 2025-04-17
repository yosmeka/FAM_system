import React from 'react';
// This file helps TypeScript understand modules without type definitions
declare module 'next-auth/react' {
  export * from 'next-auth'
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    name: string
    role: string
  }
}

declare module 'next-auth/middleware';
declare module '@auth/prisma-adapter';
declare module 'bcryptjs';
declare module 'chart.js';
declare module 'react-chartjs-2';
declare module '@tanstack/react-query';
declare module '@headlessui/react';
declare module '@heroicons/react/24/outline';
declare module 'react-hot-toast';
declare module 'qrcode';
declare module 'next/navigation';
declare module 'next/link';
declare module 'next/server';
declare module '@prisma/client';
declare module 'react-hook-form';
declare module '@hookform/resolvers/zod';
declare module 'zod';
declare module '@/lib/prisma';
declare module '@/components/navigation/navbar';
declare module 'react-icons/*';
declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp'; 