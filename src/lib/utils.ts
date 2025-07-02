import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Role } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRoleColor(role: Role) {
  const colors = {
    'ADMIN': {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
    },
    'MANAGER': {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
    },
    'USER': {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
    },
    'AUDITOR': {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
    },
  } as const;

  return colors[role];
}

export function getRoleLabel(role: Role) {
  const labels = {
    'ADMIN': "Administrator",
    'MANAGER': "Manager",
    'USER': "User",
    'AUDITOR': "Auditor",
  } as const;

  return labels[role];
} 