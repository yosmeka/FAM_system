'use client';

import React from 'react';
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface RoleBasedCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  permission?: string;
  className?: string;
  footer?: React.ReactNode;
  onClick?: () => void;
  roles?: string[];
  userRole?: string;
}

export function RoleBasedCard({
  title,
  description,
  children,
  permission,
  className,
  footer,
  onClick,
  roles,
  userRole,
}: RoleBasedCardProps) {
  const { checkPermission } = usePermissions();

  // Check if user has required permission
  if (permission && !checkPermission(permission)) {
    return null;
  }

  // Check if user has required role
  if (roles && userRole && !roles.includes(userRole)) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700",
        onClick && "cursor-pointer hover:shadow-md transition-shadow duration-200",
        className
      )}
      onClick={onClick}
    >
      {(title || description) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {title && (
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          {footer}
        </div>
      )}
    </div>
  );
} 