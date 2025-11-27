'use client'

import { useActionState } from 'react'
import { createCourseAction } from '@/actions/course-actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { ActionResult } from '@/types/actions'

const initialState: ActionResult = { success: true }

/**
 * CreateCourseForm Component
 * 
 * Form for creating a new course with title and optional description.
 * Uses Server Actions for form submission.
 * 
 * Requirements: 4.1
 */
export function CreateCourseForm() {
  const [state, formAction, isPending] = useActionState(createCourseAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Input
          label="Course Title"
          name="title"
          placeholder="e.g., OBGYN Board Review"
          error={!state.success ? state.fieldErrors?.title?.[0] : undefined}
        />
      </div>
      <div>
        <Textarea
          label="Description (optional)"
          name="description"
          placeholder="Brief description of the course..."
          rows={2}
          error={!state.success ? state.fieldErrors?.description?.[0] : undefined}
        />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Creating...' : 'Create Course'}
      </Button>
    </form>
  )
}
