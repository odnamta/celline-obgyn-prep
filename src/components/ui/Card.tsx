'use client';

import { forwardRef, HTMLAttributes } from 'react';

export type CardVariant = 'default' | 'elevated' | 'outlined';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

/**
 * Base styles that are always applied to Card component
 * Requirements: 3.4 - rounded-xl, border-slate-200, shadow-sm
 */
export const CARD_BASE_STYLES = 'rounded-xl border border-slate-200 shadow-sm bg-white dark:bg-slate-800 dark:border-slate-700';

/**
 * Returns the CSS classes for a given card variant
 */
export function getCardVariantClasses(variant: CardVariant): string {
  const variantStyles: Record<CardVariant, string> = {
    default: '', // Base styles already include default styling
    elevated: 'shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50',
    outlined: 'shadow-none bg-transparent dark:bg-transparent',
  };
  return variantStyles[variant];
}

/**
 * Card component with light/dark mode support.
 * Requirements: 3.4 - Enforce rounded-xl, border-slate-200, shadow-sm
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', padding = 'md', children, ...props }, ref) => {
    const paddingStyles: Record<CardPadding, string> = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    const combinedClassName = `${CARD_BASE_STYLES} ${getCardVariantClasses(variant)} ${paddingStyles[padding]} ${className}`.trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
