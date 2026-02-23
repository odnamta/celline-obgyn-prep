import { createSupabaseServiceClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Berhenti Berlangganan',
}

/**
 * One-click unsubscribe page.
 * Token is base64(userId). Uses service client to bypass RLS.
 * This is a server component — the update runs on page load.
 */
export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  let success = false

  try {
    // Decode token to get userId
    const userId = Buffer.from(token, 'base64').toString()

    // Basic validation: UUIDs are 36 chars
    if (!userId || userId.length !== 36) {
      return <UnsubscribeResult success={false} />
    }

    const supabase = await createSupabaseServiceClient()

    // Update profiles table — service client bypasses RLS
    const { error } = await supabase
      .from('profiles')
      .update({ email_notifications: false })
      .eq('id', userId)

    // Also update user_metadata for consistency
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { email_notifications: false },
    })

    success = !error && !authError
  } catch {
    success = false
  }

  return <UnsubscribeResult success={success} />
}

function UnsubscribeResult({ success }: { success: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* Branding */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Cekatan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Platform Asesmen & Pemetaan Kompetensi
          </p>
        </div>

        {/* Result card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          {success ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Berhasil Berhenti Berlangganan
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Anda telah berhenti berlangganan email notifikasi dari Cekatan.
                Anda tidak akan menerima email notifikasi lagi.
              </p>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Untuk mengaktifkan kembali, buka halaman{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">Profile</span>{' '}
                  di aplikasi Cekatan.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Terjadi Kesalahan
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Tidak dapat memproses permintaan berhenti berlangganan.
                Link mungkin sudah tidak valid atau sudah kedaluwarsa.
              </p>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Untuk mengelola preferensi email, silakan login ke aplikasi Cekatan
                  dan buka halaman{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">Profile</span>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} Cekatan
        </p>
      </div>
    </div>
  )
}
