'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginAction, registerAction } from '@/actions/auth-actions'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

type AuthMode = 'login' | 'register'

function SubmitButton({ mode }: { mode: AuthMode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} className="w-full">
      {mode === 'login' ? 'Sign In' : 'Create Account'}
    </Button>
  )
}

/**
 * App Logo component
 */
function AppLogo() {
  return (
    <div className="flex flex-col items-center mb-6">
      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-3">
        <span className="text-3xl font-bold text-white">S</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Specialize
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Medical exam preparation
      </p>
    </div>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setFieldErrors({})

    const action = mode === 'login' ? loginAction : registerAction
    const result = await action(formData)

    // If we get here, there was an error (success redirects)
    if (!result.success) {
      setError(result.error)
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      }
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setIsGoogleLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setIsGoogleLoading(false)
      }
      // If successful, the page will redirect to Google
    } catch {
      setError('Failed to connect to Google. Please try again.')
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <AppLogo />

        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            {mode === 'login'
              ? 'Sign in to continue studying'
              : 'Start your learning journey'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Google Sign In Button */}
        <Button
          type="button"
          variant="secondary"
          onClick={handleGoogleSignIn}
          loading={isGoogleLoading}
          className="w-full mb-4"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">
              or continue with email
            </span>
          </div>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            error={fieldErrors.email?.[0]}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            error={fieldErrors.password?.[0]}
            required
          />

          {mode === 'register' && (
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              error={fieldErrors.confirmPassword?.[0]}
              required
            />
          )}

          <SubmitButton mode={mode} />
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError(null)
              setFieldErrors({})
            }}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm transition-colors"
          >
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </Card>
    </div>
  )
}
