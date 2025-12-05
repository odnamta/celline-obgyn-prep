/**
 * LegalFooter Component
 * Displays Terms and Privacy Policy links for the login page.
 * Requirements: 1.5, 2.3, 2.4
 */
export function LegalFooter() {
  return (
    <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
      By continuing, you agree to our{' '}
      <a
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        Terms
      </a>{' '}
      and{' '}
      <a
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        Privacy Policy
      </a>
    </p>
  )
}
