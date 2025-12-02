'use client'

import { useState, useEffect } from 'react'
import { BookOpen, FolderTree, Lightbulb, ArrowRight, Merge, Loader2 } from 'lucide-react'
import { TagBadge } from './TagBadge'
import { getCategoryColorClasses } from '@/lib/tag-colors'
import { getTagsByCategory, updateTagCategory, mergeTags } from '@/actions/admin-tag-actions'
import { useToast } from '@/components/ui/Toast'
import type { Tag, TagCategory } from '@/types/database'

interface TagsByCategory {
  source: Tag[]
  topic: Tag[]
  concept: Tag[]
}

/**
 * TagManager - Admin UI for managing tag categories and merging tags
 * V9: Three-column layout with category management and merge functionality
 * Requirements: V9-3.1, V9-3.2, V9-3.3
 */
export function TagManager() {
  const { showToast } = useToast()
  const [tags, setTags] = useState<TagsByCategory>({ source: [], topic: [], concept: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isMerging, setIsMerging] = useState(false)
  const [updatingTagId, setUpdatingTagId] = useState<string | null>(null)

  // Load tags on mount
  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    setIsLoading(true)
    const result = await getTagsByCategory()
    setTags(result)
    setIsLoading(false)
  }

  async function handleCategoryChange(tagId: string, newCategory: TagCategory) {
    setUpdatingTagId(tagId)
    const result = await updateTagCategory(tagId, newCategory)
    setUpdatingTagId(null)

    if (result.ok) {
      showToast('Tag category updated', 'success')
      loadTags()
    } else {
      showToast(result.error, 'error')
    }
  }

  function toggleTagSelection(tagId: string) {
    setSelectedTags(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId)
      }
      if (prev.length >= 2) {
        return [prev[1], tagId] // Keep last selected + new
      }
      return [...prev, tagId]
    })
  }

  async function handleMerge() {
    if (selectedTags.length !== 2) {
      showToast('Select exactly 2 tags to merge', 'error')
      return
    }

    const [sourceId, targetId] = selectedTags
    const allTags = [...tags.source, ...tags.topic, ...tags.concept]
    const sourceTag = allTags.find(t => t.id === sourceId)
    const targetTag = allTags.find(t => t.id === targetId)

    if (!sourceTag || !targetTag) return

    const confirmed = window.confirm(
      `Merge "${sourceTag.name}" into "${targetTag.name}"?\n\nAll cards tagged with "${sourceTag.name}" will be re-tagged with "${targetTag.name}", and "${sourceTag.name}" will be deleted.`
    )

    if (!confirmed) return

    setIsMerging(true)
    const result = await mergeTags(sourceId, targetId)
    setIsMerging(false)

    if (result.ok) {
      showToast(`Merged ${result.mergedCount} associations`, 'success')
      setSelectedTags([])
      loadTags()
    } else {
      showToast(result.error, 'error')
    }
  }

  const categoryConfig: Array<{
    key: TagCategory
    title: string
    icon: typeof BookOpen
    description: string
  }> = [
    {
      key: 'source',
      title: 'Sources',
      icon: BookOpen,
      description: 'Textbook origins',
    },
    {
      key: 'topic',
      title: 'Topics',
      icon: FolderTree,
      description: 'Medical domains',
    },
    {
      key: 'concept',
      title: 'Concepts',
      icon: Lightbulb,
      description: 'Specific concepts',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Merge toolbar */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
          </span>
          {selectedTags.length === 2 && (
            <button
              onClick={handleMerge}
              disabled={isMerging}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isMerging ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Merge className="w-4 h-4" />
              )}
              Merge Tags
            </button>
          )}
          <button
            onClick={() => setSelectedTags([])}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Three-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categoryConfig.map(({ key, title, icon: Icon, description }) => {
          const categoryTags = tags[key]
          const { bgClass, textClass } = getCategoryColorClasses(key)

          return (
            <div
              key={key}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Header */}
              <div className={`px-4 py-3 ${bgClass}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${textClass}`} />
                  <h3 className={`font-medium ${textClass}`}>{title}</h3>
                  <span className={`ml-auto text-sm ${textClass}`}>
                    {categoryTags.length}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${textClass} opacity-75`}>{description}</p>
              </div>

              {/* Tag list */}
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {categoryTags.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No {title.toLowerCase()} yet
                  </p>
                ) : (
                  categoryTags.map(tag => {
                    const isSelected = selectedTags.includes(tag.id)
                    const isUpdating = updatingTagId === tag.id

                    return (
                      <div
                        key={tag.id}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {/* Selection checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTagSelection(tag.id)}
                          className="w-4 h-4 rounded border-slate-300"
                        />

                        {/* Tag badge */}
                        <TagBadge tag={tag} size="md" />

                        {/* Category selector */}
                        <select
                          value={tag.category}
                          onChange={(e) => handleCategoryChange(tag.id, e.target.value as TagCategory)}
                          disabled={isUpdating}
                          className="ml-auto text-xs bg-transparent border border-slate-200 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="source">Source</option>
                          <option value="topic">Topic</option>
                          <option value="concept">Concept</option>
                        </select>

                        {isUpdating && (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Instructions */}
      <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
        <p>• Select a tag's category from the dropdown to move it between columns</p>
        <p>• Check two tags and click "Merge Tags" to combine them</p>
        <p>• Merging transfers all card associations to the second selected tag</p>
      </div>
    </div>
  )
}
