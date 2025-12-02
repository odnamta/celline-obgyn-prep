'use client'

import { useState, useEffect } from 'react'
import { BookOpen, FolderTree, ChevronDown, Check } from 'lucide-react'
import { getCategoryColorClasses } from '@/lib/tag-colors'
import { getUserTags } from '@/actions/tag-actions'
import type { Tag } from '@/types/database'

interface SessionPresetsProps {
  selectedSourceId: string | null
  selectedTopicId: string | null
  onSourceChange: (tagId: string | null) => void
  onTopicChange: (tagId: string | null) => void
}

/**
 * SessionPresets - Source and Topic dropdowns for bulk import sessions
 * V9: Separate dropdowns for Source (textbook) and Topic (chapter) selection
 * Requirements: V9-5.1
 */
export function SessionPresets({
  selectedSourceId,
  selectedTopicId,
  onSourceChange,
  onTopicChange,
}: SessionPresetsProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [topicOpen, setTopicOpen] = useState(false)

  useEffect(() => {
    async function loadTags() {
      const userTags = await getUserTags()
      setTags(userTags)
      setIsLoading(false)
    }
    loadTags()
  }, [])

  const sources = tags.filter(t => t.category === 'source')
  const topics = tags.filter(t => t.category === 'topic')

  const selectedSource = sources.find(t => t.id === selectedSourceId)
  const selectedTopic = topics.find(t => t.id === selectedTopicId)

  const sourceColors = getCategoryColorClasses('source')
  const topicColors = getCategoryColorClasses('topic')

  if (isLoading) {
    return (
      <div className="flex gap-4">
        <div className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Source Dropdown */}
      <div className="flex-1 relative">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          <BookOpen className="w-4 h-4 inline mr-1" />
          Source (Textbook)
        </label>
        <button
          type="button"
          onClick={() => {
            setSourceOpen(!sourceOpen)
            setTopicOpen(false)
          }}
          className={`w-full px-3 py-2 text-left bg-white dark:bg-slate-800 border rounded-lg flex items-center justify-between ${
            selectedSource
              ? `${sourceColors.bgClass} border-blue-300 dark:border-blue-700`
              : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          <span className={selectedSource ? sourceColors.textClass : 'text-slate-400'}>
            {selectedSource?.name || 'Select source...'}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {sourceOpen && (
          <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onSourceChange(null)
                setSourceOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              None
            </button>
            {sources.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  onSourceChange(tag.id)
                  setSourceOpen(false)
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <span className={`w-3 h-3 rounded-full ${sourceColors.bgClass}`} />
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                  {tag.name}
                </span>
                {selectedSourceId === tag.id && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
            {sources.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-400">
                No sources available. Add them in Tag Manager.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Topic Dropdown */}
      <div className="flex-1 relative">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          <FolderTree className="w-4 h-4 inline mr-1" />
          Topic (Chapter)
        </label>
        <button
          type="button"
          onClick={() => {
            setTopicOpen(!topicOpen)
            setSourceOpen(false)
          }}
          className={`w-full px-3 py-2 text-left bg-white dark:bg-slate-800 border rounded-lg flex items-center justify-between ${
            selectedTopic
              ? `${topicColors.bgClass} border-purple-300 dark:border-purple-700`
              : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          <span className={selectedTopic ? topicColors.textClass : 'text-slate-400'}>
            {selectedTopic?.name || 'Select topic...'}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {topicOpen && (
          <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onTopicChange(null)
                setTopicOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              None
            </button>
            {topics.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  onTopicChange(tag.id)
                  setTopicOpen(false)
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <span className={`w-3 h-3 rounded-full ${topicColors.bgClass}`} />
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                  {tag.name}
                </span>
                {selectedTopicId === tag.id && (
                  <Check className="w-4 h-4 text-purple-600" />
                )}
              </button>
            ))}
            {topics.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-400">
                No topics available. Add them in Tag Manager.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook to get session tag names from selected IDs
 */
export function useSessionTagNames(
  tags: Tag[],
  sourceId: string | null,
  topicId: string | null
): string[] {
  const result: string[] = []
  
  if (sourceId) {
    const source = tags.find(t => t.id === sourceId)
    if (source) result.push(source.name)
  }
  
  if (topicId) {
    const topic = tags.find(t => t.id === topicId)
    if (topic) result.push(topic.name)
  }
  
  return result
}
