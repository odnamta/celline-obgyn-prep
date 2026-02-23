// Setup checklist data layer — pure functions for generating onboarding checklists.

export interface ChecklistItem {
  id: string
  label: string
  description: string
  done: boolean
  href: string
}

export interface OrgStats {
  deckCount: number
  cardCount: number
  assessmentCount: number
  memberCount: number
}

export interface UserStats {
  hasName: boolean
  hasAvatar: boolean
  assessmentsTaken: number
}

/**
 * Returns the admin/owner onboarding checklist (4 items).
 * Each item's `done` state is derived from org statistics.
 */
export function getAdminChecklist(stats: OrgStats): ChecklistItem[] {
  return [
    {
      id: 'create-first-deck',
      label: 'Buat deck pertama',
      description: 'Buat deck soal pertama untuk organisasi Anda.',
      done: stats.deckCount > 0,
      href: '/library',
    },
    {
      id: 'add-cards',
      label: 'Tambah soal (min. 5)',
      description: 'Tambahkan minimal 5 soal ke deck Anda.',
      done: stats.cardCount >= 5,
      href: '/library',
    },
    {
      id: 'publish-first-assessment',
      label: 'Publikasi asesmen pertama',
      description: 'Publikasikan asesmen pertama agar kandidat bisa mengikuti.',
      done: stats.assessmentCount > 0,
      href: '/assessments/create',
    },
    {
      id: 'invite-candidate',
      label: 'Undang kandidat',
      description: 'Undang kandidat ke organisasi Anda.',
      done: stats.memberCount > 1,
      href: '/orgs',
    },
  ]
}

/**
 * Returns the candidate onboarding checklist (3 items).
 * Each item's `done` state is derived from user statistics.
 */
export function getCandidateChecklist(stats: UserStats): ChecklistItem[] {
  return [
    {
      id: 'complete-profile',
      label: 'Lengkapi profil',
      description: 'Lengkapi nama dan foto profil Anda.',
      done: stats.hasName,
      href: '/profile',
    },
    {
      id: 'view-assessments',
      label: 'Lihat asesmen tersedia',
      description: 'Lihat daftar asesmen yang tersedia untuk Anda.',
      done: stats.assessmentsTaken > 0,
      href: '/assessments',
    },
    {
      id: 'take-first-assessment',
      label: 'Ikuti asesmen pertama',
      description: 'Ikuti asesmen pertama Anda untuk memulai.',
      done: stats.assessmentsTaken > 0,
      href: '/assessments',
    },
  ]
}

/**
 * Returns true when every item in the checklist has `done === true`.
 * An empty checklist is considered complete (vacuous truth).
 */
export function isChecklistComplete(items: ChecklistItem[]): boolean {
  return items.every((item) => item.done)
}
