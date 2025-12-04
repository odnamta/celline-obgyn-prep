'use client';

import { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Icon to display above the title */
  icon?: ReactNode;
  /** Main title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action button or link */
  action?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyState component for displaying friendly messages when lists are empty.
 * Requirements: 3.5 - Display friendly empty state with icon and message
 */
export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className = '' 
}: EmptyStateProps) {
  return (
    <div 
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className="mb-4 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
