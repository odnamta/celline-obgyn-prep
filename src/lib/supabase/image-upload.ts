/**
 * Supabase Storage Image Upload Utilities
 * 
 * V6.2: Vision MVP - handles large image uploads to Supabase Storage
 */

import { createSupabaseServerClient } from './server'
import { logger } from '@/lib/logger'

const BUCKET_NAME = 'vision-images'
const SIGNED_URL_EXPIRY = 3600 // 1 hour

export type UploadResult = 
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * Upload an image to Supabase Storage and return a signed URL.
 * Used when images are too large for base64 encoding.
 */
export async function uploadImageForVision(
  file: File,
  userId: string
): Promise<UploadResult> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Generate unique filename
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${userId}/${timestamp}.${ext}`
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      })
    
    if (uploadError) {
      logger.error('uploadImageForVision.upload', uploadError)
      return { ok: false, error: 'Failed to upload image' }
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filename, SIGNED_URL_EXPIRY)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      logger.error('uploadImageForVision.signedUrl', signedUrlError)
      return { ok: false, error: 'Failed to generate image URL' }
    }
    
    return { ok: true, url: signedUrlData.signedUrl }
  } catch (error) {
    logger.error('uploadImageForVision', error)
    return { ok: false, error: 'Failed to upload image' }
  }
}

/**
 * Delete an image from Supabase Storage.
 * Can be used for cleanup of temporary vision images.
 */
export async function deleteVisionImage(
  filename: string
): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filename])
    
    if (error) {
      logger.error('deleteVisionImage.remove', error)
      return false
    }

    return true
  } catch (error) {
    logger.error('deleteVisionImage', error)
    return false
  }
}
