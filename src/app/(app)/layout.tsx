import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { logoutAction } from '@/actions/auth-actions'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ToastProvider } from '@/components/ui/Toast'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <a href="/dashboard" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Celline&apos;s OBGYN Prep
              </a>
              <nav className="hidden sm:flex items-center gap-4">
                <a 
                  href="/library" 
                  className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  Library
                </a>
                <a 
                  href="/library/my" 
                  className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  My Library
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Logout
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </main>
      </div>
    </ToastProvider>
  )
}
