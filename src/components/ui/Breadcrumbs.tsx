'use client'

/**
 * V17: Reusable Breadcrumb Navigation
 */

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
              {isLast || !item.href ? (
                <span className={isLast ? 'text-slate-900 dark:text-slate-100 font-medium' : ''}>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
