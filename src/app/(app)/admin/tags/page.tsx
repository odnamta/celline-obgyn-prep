export const metadata = { title: 'Tag Manager' }

import { TagManager } from '@/components/tags/TagManager'

/**
 * Admin Tag Manager Page
 * V9: Manage tag categories and merge duplicate tags
 * Requirements: V9-3.1
 */
export default function AdminTagsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Tag Manager
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Organize your tags into Sources, Topics, and Concepts
        </p>
      </div>

      <TagManager />
    </div>
  )
}
