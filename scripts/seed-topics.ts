/**
 * V9: Seed Golden List - Official Topics and Sources
 * 
 * This script seeds the official taxonomy tags for the 3-tier ontology:
 * - Sources: Textbook origins (Williams, Lange, MRCOG)
 * - Topics: Medical domains (Anatomy, Endocrinology, etc.)
 * 
 * The script is idempotent - safe to run multiple times without duplicating tags.
 * 
 * Usage: npx tsx scripts/seed-topics.ts
 * 
 * Requirements: V9-2.1, V9-2.2, V9-2.3, V9-2.4
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Golden List: Official Topics (Purple)
const OFFICIAL_TOPICS = [
  'Anatomy',
  'Endocrinology',
  'Infections',
  'Oncology',
  'MaternalFetal',
  'Obstetrics',
  'Gynecology',
  'Pharmacology',
  'Pathology',
  'Embryology',
]

// Golden List: Official Sources (Blue)
const OFFICIAL_SOURCES = [
  'Williams',
  'Lange',
  'MRCOG',
  'ACOG',
  'UpToDate',
]

// Category to color mapping (must match tag-colors.ts)
const CATEGORY_COLORS = {
  source: 'blue',
  topic: 'purple',
  concept: 'green',
} as const

type TagCategory = keyof typeof CATEGORY_COLORS

interface GoldenTag {
  name: string
  category: TagCategory
  color: string
}

/**
 * Build the list of golden tags to seed
 */
function buildGoldenTags(): GoldenTag[] {
  const tags: GoldenTag[] = []
  
  // Add topics
  for (const name of OFFICIAL_TOPICS) {
    tags.push({
      name,
      category: 'topic',
      color: CATEGORY_COLORS.topic,
    })
  }
  
  // Add sources
  for (const name of OFFICIAL_SOURCES) {
    tags.push({
      name,
      category: 'source',
      color: CATEGORY_COLORS.source,
    })
  }
  
  return tags
}

/**
 * Seed golden tags for a specific user
 * Uses upsert to ensure idempotence
 */
async function seedGoldenTagsForUser(userId: string): Promise<{ created: number; skipped: number }> {
  const goldenTags = buildGoldenTags()
  let created = 0
  let skipped = 0
  
  for (const tag of goldenTags) {
    // Check if tag already exists (case-insensitive)
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', tag.name)
      .single()
    
    if (existing) {
      // Update existing tag to ensure correct category and color
      await supabase
        .from('tags')
        .update({ category: tag.category, color: tag.color })
        .eq('id', existing.id)
      skipped++
    } else {
      // Create new tag
      const { error } = await supabase
        .from('tags')
        .insert({
          user_id: userId,
          name: tag.name,
          category: tag.category,
          color: tag.color,
        })
      
      if (error) {
        console.error(`Failed to create tag "${tag.name}":`, error.message)
      } else {
        created++
      }
    }
  }
  
  return { created, skipped }
}

/**
 * Main seed function
 */
async function main() {
  console.log('V9: Seeding Golden List Tags...')
  console.log(`Topics: ${OFFICIAL_TOPICS.join(', ')}`)
  console.log(`Sources: ${OFFICIAL_SOURCES.join(', ')}`)
  console.log('')
  
  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('user_stats')
    .select('user_id')
  
  if (usersError) {
    console.error('Failed to fetch users:', usersError.message)
    process.exit(1)
  }
  
  if (!users || users.length === 0) {
    console.log('No users found. Skipping seed.')
    return
  }
  
  console.log(`Found ${users.length} user(s) to seed.`)
  
  let totalCreated = 0
  let totalSkipped = 0
  
  for (const user of users) {
    const { created, skipped } = await seedGoldenTagsForUser(user.user_id)
    totalCreated += created
    totalSkipped += skipped
    console.log(`User ${user.user_id}: ${created} created, ${skipped} skipped`)
  }
  
  console.log('')
  console.log('Seed complete!')
  console.log(`Total: ${totalCreated} tags created, ${totalSkipped} tags skipped`)
}

main().catch(console.error)
