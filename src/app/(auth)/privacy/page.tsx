import { Card } from '@/components/ui/Card'

/**
 * Privacy Policy Page
 * Requirements: 2.2
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
      <Card variant="elevated" padding="lg" className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Privacy Policy
        </h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Last updated: December 2024
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
            1. Information We Collect
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            We collect information you provide directly to us, such as when you create an 
            account, use our services, or contact us for support. This includes your email 
            address and study progress data.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
            2. How We Use Your Information
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            We use the information we collect to provide, maintain, and improve our services, 
            including personalizing your study experience through spaced repetition algorithms.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
            3. Information Sharing
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            We do not share your personal information with third parties except as described 
            in this policy or with your consent. We may share aggregated, non-personally 
            identifiable information publicly.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
            4. Data Security
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            We take reasonable measures to help protect your personal information from loss, 
            theft, misuse, unauthorized access, disclosure, alteration, and destruction.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
            5. Data Retention
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            We retain your information for as long as your account is active or as needed to 
            provide you services. You may request deletion of your account and associated data 
            at any time.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
            6. Your Rights
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            You have the right to access, correct, or delete your personal information. 
            You may also object to or restrict certain processing of your information.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
            7. Changes to This Policy
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            We may update this privacy policy from time to time. We will notify you of any 
            changes by posting the new policy on this page.
          </p>

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3">
            8. Contact Us
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            If you have any questions about this Privacy Policy, please contact us.
          </p>
        </div>
      </Card>
    </div>
  )
}
